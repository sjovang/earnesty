import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  portableTextToHtml,
  tiptapJsonToPortableText,
  buildSanityImageUrl,
  extractPreview,
  fetchBlogDocuments,
  fetchBlogDocument,
  type SanityBodyBlock,
  type SanityBlock,
  type TiptapNode,
} from '../sanity.js'

// Hoist mockFetch so it's available inside the vi.mock() factory.
const { mockClientFetch } = vi.hoisted(() => ({
  mockClientFetch: vi.fn(),
}))

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({ fetch: mockClientFetch })),
}))

// ── buildSanityImageUrl ───────────────────────────────────────────────────────

describe('buildSanityImageUrl', () => {
  it('converts a Sanity image reference to a CDN URL', () => {
    const url = buildSanityImageUrl('image-abc123deadbeef-1920x1080-jpg')
    expect(url).toContain('cdn.sanity.io/images')
    expect(url).toContain('test-project-id')
    expect(url).toContain('abc123deadbeef-1920x1080.jpg')
  })

  it('uses the configured dataset in the URL', () => {
    const url = buildSanityImageUrl('image-abc123-800x600-png')
    expect(url).toContain('/production/')
  })
})

// ── extractPreview ────────────────────────────────────────────────────────────

describe('extractPreview', () => {
  it('returns empty string for undefined input', () => {
    expect(extractPreview(undefined)).toBe('')
  })

  it('returns empty string for empty array', () => {
    expect(extractPreview([])).toBe('')
  })

  it('extracts text from the first paragraph block', () => {
    const blocks: SanityBodyBlock[] = [
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's1', _type: 'span', text: 'Hello world', marks: [] }],
        markDefs: [],
      },
    ]
    expect(extractPreview(blocks)).toBe('Hello world')
  })

  it('joins text across multiple spans', () => {
    const blocks: SanityBodyBlock[] = [
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [
          { _key: 's1', _type: 'span', text: 'Hello', marks: [] },
          { _key: 's2', _type: 'span', text: ' world', marks: [] },
        ],
        markDefs: [],
      },
    ]
    expect(extractPreview(blocks)).toBe('Hello world')
  })

  it('truncates text to 50 words with an ellipsis', () => {
    const words = Array.from({ length: 60 }, (_, i) => `word${i}`).join(' ')
    const blocks: SanityBodyBlock[] = [
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's1', _type: 'span', text: words, marks: [] }],
        markDefs: [],
      },
    ]
    const preview = extractPreview(blocks)
    expect(preview.split(' ').length).toBe(50)
    expect(preview.endsWith('…')).toBe(true)
  })

  it('returns full text when it is 50 words or fewer', () => {
    const words = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ')
    const blocks: SanityBodyBlock[] = [
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's1', _type: 'span', text: words, marks: [] }],
        markDefs: [],
      },
    ]
    expect(extractPreview(blocks)).toBe(words)
  })

  it('skips non-text blocks (images, code) to find the first paragraph', () => {
    const blocks: SanityBodyBlock[] = [
      { _key: 'img1', _type: 'image', asset: { _ref: 'image-x-100x100-jpg', _type: 'reference' } },
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's1', _type: 'span', text: 'After image', marks: [] }],
        markDefs: [],
      },
    ]
    expect(extractPreview(blocks)).toBe('After image')
  })
})

// ── portableTextToHtml ────────────────────────────────────────────────────────

describe('portableTextToHtml', () => {
  it('returns a blank paragraph for undefined input', () => {
    expect(portableTextToHtml(undefined)).toBe('<p></p>')
  })

  it('returns a blank paragraph for empty array', () => {
    expect(portableTextToHtml([])).toBe('<p></p>')
  })

  it('renders a normal paragraph', () => {
    const blocks: SanityBodyBlock[] = [
      {
        _key: 'k1',
        _type: 'block',
        style: 'normal',
        children: [{ _key: 's1', _type: 'span', text: 'Hello', marks: [] }],
        markDefs: [],
      },
    ]
    expect(portableTextToHtml(blocks)).toBe('<p>Hello</p>')
  })

  it('renders h1 heading', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'h1', children: [{ _key: 's1', _type: 'span', text: 'Title', marks: [] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<h1>Title</h1>')
  })

  it('renders h2 heading', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'h2', children: [{ _key: 's1', _type: 'span', text: 'Section', marks: [] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<h2>Section</h2>')
  })

  it('renders h3 heading', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'h3', children: [{ _key: 's1', _type: 'span', text: 'Sub', marks: [] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<h3>Sub</h3>')
  })

  it('renders h4 as h3 (Tiptap only supports up to h3)', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'h4', children: [{ _key: 's1', _type: 'span', text: 'Sub', marks: [] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<h3>Sub</h3>')
  })

  it('renders a blockquote', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'blockquote', children: [{ _key: 's1', _type: 'span', text: 'Wise words', marks: [] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<blockquote><p>Wise words</p></blockquote>')
  })

  it('renders bold inline mark', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'normal', children: [{ _key: 's1', _type: 'span', text: 'bold text', marks: ['strong'] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<p><strong>bold text</strong></p>')
  })

  it('renders italic inline mark', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'normal', children: [{ _key: 's1', _type: 'span', text: 'italic', marks: ['em'] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<p><em>italic</em></p>')
  })

  it('renders inline code mark', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'normal', children: [{ _key: 's1', _type: 'span', text: 'code', marks: ['code'] }], markDefs: [] }
    expect(portableTextToHtml([block])).toBe('<p><code>code</code></p>')
  })

  it('renders a link', () => {
    const block: SanityBlock = {
      _key: 'k1',
      _type: 'block',
      style: 'normal',
      children: [{ _key: 's1', _type: 'span', text: 'click here', marks: ['link1'] }],
      markDefs: [{ _key: 'link1', _type: 'link', href: 'https://example.com' }],
    }
    const html = portableTextToHtml([block])
    expect(html).toContain('<a href="https://example.com"')
    expect(html).toContain('click here')
    expect(html).toContain('rel="noopener noreferrer"')
  })

  it('escapes HTML special characters', () => {
    const block: SanityBlock = { _key: 'k1', _type: 'block', style: 'normal', children: [{ _key: 's1', _type: 'span', text: '<script>alert("xss")</script>', marks: [] }], markDefs: [] }
    const html = portableTextToHtml([block])
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('renders a code block with language class', () => {
    const blocks: SanityBodyBlock[] = [
      { _key: 'k1', _type: 'code', code: 'const x = 1', language: 'javascript' },
    ]
    const html = portableTextToHtml(blocks)
    expect(html).toBe('<pre><code class="language-javascript">const x = 1</code></pre>')
  })

  it('renders a code block without language', () => {
    const blocks: SanityBodyBlock[] = [
      { _key: 'k1', _type: 'code', code: 'plain code' },
    ]
    const html = portableTextToHtml(blocks)
    expect(html).toBe('<pre><code>plain code</code></pre>')
  })

  it('renders an image block', () => {
    const blocks: SanityBodyBlock[] = [
      { _key: 'k1', _type: 'image', asset: { _ref: 'image-abc-100x100-jpg', _type: 'reference' }, alt: 'A photo' },
    ]
    const html = portableTextToHtml(blocks)
    expect(html).toContain('<img')
    expect(html).toContain('alt="A photo"')
    expect(html).toContain('cdn.sanity.io')
  })

  it('renders a bullet list', () => {
    const blocks: SanityBodyBlock[] = [
      { _key: 'k1', _type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [{ _key: 's1', _type: 'span', text: 'Item one', marks: [] }], markDefs: [] },
      { _key: 'k2', _type: 'block', style: 'normal', listItem: 'bullet', level: 1, children: [{ _key: 's2', _type: 'span', text: 'Item two', marks: [] }], markDefs: [] },
    ]
    const html = portableTextToHtml(blocks)
    expect(html).toBe('<ul><li>Item one</li><li>Item two</li></ul>')
  })

  it('renders an ordered list', () => {
    const blocks: SanityBodyBlock[] = [
      { _key: 'k1', _type: 'block', style: 'normal', listItem: 'number', level: 1, children: [{ _key: 's1', _type: 'span', text: 'First', marks: [] }], markDefs: [] },
    ]
    expect(portableTextToHtml(blocks)).toBe('<ol><li>First</li></ol>')
  })
})

// ── tiptapJsonToPortableText ──────────────────────────────────────────────────

describe('tiptapJsonToPortableText', () => {
  it('converts an empty document', () => {
    expect(tiptapJsonToPortableText({ type: 'doc', content: [] })).toEqual([])
  })

  it('converts a paragraph with plain text', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
      ],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect(blocks).toHaveLength(1)
    const block = blocks[0] as SanityBlock
    expect(block._type).toBe('block')
    expect(block.style).toBe('normal')
    expect(block.children[0].text).toBe('Hello world')
    expect(block.children[0].marks).toEqual([])
  })

  it('converts a heading level 1', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Title' }] }],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect((blocks[0] as SanityBlock).style).toBe('h1')
  })

  it('converts a heading level 2', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [{ type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Section' }] }],
    }
    expect((tiptapJsonToPortableText(doc)[0] as SanityBlock).style).toBe('h2')
  })

  it('converts a blockquote', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        { type: 'blockquote', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A quote' }] }] },
      ],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect((blocks[0] as SanityBlock).style).toBe('blockquote')
    expect((blocks[0] as SanityBlock).children[0].text).toBe('A quote')
  })

  it('converts bold mark to "strong"', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'bold', marks: [{ type: 'bold' }] }] },
      ],
    }
    const block = tiptapJsonToPortableText(doc)[0] as SanityBlock
    expect(block.children[0].marks).toContain('strong')
  })

  it('converts italic mark to "em"', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'italic', marks: [{ type: 'italic' }] }] },
      ],
    }
    const block = tiptapJsonToPortableText(doc)[0] as SanityBlock
    expect(block.children[0].marks).toContain('em')
  })

  it('converts code mark', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'code', marks: [{ type: 'code' }] }] },
      ],
    }
    const block = tiptapJsonToPortableText(doc)[0] as SanityBlock
    expect(block.children[0].marks).toContain('code')
  })

  it('converts a link mark into a markDef', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'click', marks: [{ type: 'link', attrs: { href: 'https://example.com' } }] }],
        },
      ],
    }
    const block = tiptapJsonToPortableText(doc)[0] as SanityBlock
    expect(block.markDefs).toHaveLength(1)
    expect(block.markDefs[0]._type).toBe('link')
    expect(block.markDefs[0].href).toBe('https://example.com')
    // The span should reference the markDef key
    expect(block.children[0].marks).toContain(block.markDefs[0]._key)
  })

  it('converts a bullet list', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Item' }] }] },
          ],
        },
      ],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect(blocks).toHaveLength(1)
    expect((blocks[0] as SanityBlock).listItem).toBe('bullet')
  })

  it('converts an ordered list', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        {
          type: 'orderedList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }] },
          ],
        },
      ],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect((blocks[0] as SanityBlock).listItem).toBe('number')
  })

  it('converts a code block', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [{ type: 'codeBlock', attrs: { language: 'typescript' }, content: [{ type: 'text', text: 'const x = 1' }] }],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect(blocks[0]._type).toBe('code')
    const cb = blocks[0] as { _type: 'code'; code: string; language?: string }
    expect(cb.code).toBe('const x = 1')
    expect(cb.language).toBe('typescript')
  })

  it('converts a Sanity CDN image back to a reference', () => {
    const src = 'https://cdn.sanity.io/images/test-project-id/production/abc123-100x100.jpg'
    const doc: TiptapNode = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src, alt: 'A photo' } }],
    }
    const blocks = tiptapJsonToPortableText(doc)
    expect(blocks[0]._type).toBe('image')
    const img = blocks[0] as { _type: 'image'; asset: { _ref: string }; alt: string }
    expect(img.asset._ref).toContain('image-')
    expect(img.alt).toBe('A photo')
  })

  it('ignores non-CDN images', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://external-site.com/photo.jpg', alt: '' } }],
    }
    expect(tiptapJsonToPortableText(doc)).toHaveLength(0)
  })

  it('produces unique _key values for each block', () => {
    const doc: TiptapNode = {
      type: 'doc',
      content: [
        { type: 'paragraph', content: [{ type: 'text', text: 'Para 1' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'Para 2' }] },
      ],
    }
    const blocks = tiptapJsonToPortableText(doc)
    const keys = blocks.map((b) => b._key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})

// ── fetchBlogDocuments ────────────────────────────────────────────────────────

describe('fetchBlogDocuments', () => {
  beforeEach(() => {
    mockClientFetch.mockReset()
  })

  it('returns the list of blog documents', async () => {
    const mockDocs = [
      { _id: 'doc-1', title: 'First Post', _createdAt: '2024-01-01', _updatedAt: '2024-01-01' },
      { _id: 'doc-2', title: 'Second Post', _createdAt: '2024-01-02', _updatedAt: '2024-01-02' },
    ]
    mockClientFetch.mockResolvedValue(mockDocs)

    const docs = await fetchBlogDocuments()
    expect(docs).toEqual(mockDocs)
  })

  it('queries Sanity with a GROQ expression', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchBlogDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    const params = mockClientFetch.mock.calls[0][1] as Record<string, unknown>
    expect(query).toMatch(/^\s*\*\[/)
    expect(query).toContain('_type == $docType')
    expect(params).toMatchObject({ docType: 'blog' })
  })

  it('orders results by published date descending', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchBlogDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('order(')
    expect(query).toContain('desc')
  })
})

// ── fetchBlogDocument ─────────────────────────────────────────────────────────

describe('fetchBlogDocument', () => {
  beforeEach(() => {
    mockClientFetch.mockReset()
  })

  it('returns the document', async () => {
    const mockDoc = { _id: 'doc-1', title: 'My Post', _createdAt: '2024-01-01', _updatedAt: '2024-01-01', body: [] }
    mockClientFetch.mockResolvedValue(mockDoc)

    const doc = await fetchBlogDocument('doc-1')
    expect(doc).toEqual(mockDoc)
  })

  it('passes the document ID as a GROQ parameter', async () => {
    mockClientFetch.mockResolvedValue(null)
    await fetchBlogDocument('my-doc-id')

    const params = mockClientFetch.mock.calls[0][1] as Record<string, string>
    expect(params).toMatchObject({ id: 'my-doc-id' })
  })

  it('queries by _id using a GROQ expression', async () => {
    mockClientFetch.mockResolvedValue(null)
    await fetchBlogDocument('doc-1')

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('_id == $id')
  })
})
