import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

// ── Types ─────────────────────────────────────────────────────────────────────

export interface SanitySpan {
  _key: string
  _type: 'span'
  text: string
  marks: string[]
}

export interface SanityMarkDef {
  _key: string
  _type: string
  href?: string
}

export interface SanityBlock {
  _key: string
  _type: 'block'
  style: 'normal' | 'h1' | 'h2' | 'h3' | 'h4' | 'blockquote'
  listItem?: 'bullet' | 'number'
  level?: number
  children: SanitySpan[]
  markDefs: SanityMarkDef[]
}

export interface BlogDocument {
  _id: string
  _updatedAt: string
  title: string
  body?: SanityBlock[]
}

// ── Preview extraction ────────────────────────────────────────────────────────

/** Returns the first paragraph — or first 50 words if that paragraph is longer. */
export function extractPreview(blocks: SanityBlock[] | undefined): string {
  if (!blocks?.length) return ''

  // Find the first non-empty text block
  const first = blocks.find(
    (b) => b._type === 'block' && b.children.some((c) => c.text?.trim()),
  )
  if (!first) return ''

  const text = first.children
    .map((c) => c.text ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim()

  const words = text.split(' ').filter(Boolean)
  if (words.length <= 50) return text
  return words.slice(0, 50).join(' ') + '…'
}

// ── PortableText → HTML ───────────────────────────────────────────────────────

/** Converts a Sanity PortableText body to HTML Tiptap can load. */
export function portableTextToHtml(blocks: SanityBlock[] | undefined): string {
  if (!blocks?.length) return '<p></p>'

  const parts: string[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    // List items — collect consecutive items of the same list type & level
    if (block.listItem) {
      const tag = block.listItem === 'bullet' ? 'ul' : 'ol'
      const items: string[] = []
      while (i < blocks.length && blocks[i].listItem === block.listItem) {
        items.push(`<li>${renderInline(blocks[i])}</li>`)
        i++
      }
      parts.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    // Regular blocks
    switch (block.style) {
      case 'h1':
        parts.push(`<h1>${renderInline(block)}</h1>`)
        break
      case 'h2':
        parts.push(`<h2>${renderInline(block)}</h2>`)
        break
      case 'h3':
      case 'h4':
        parts.push(`<h3>${renderInline(block)}</h3>`)
        break
      case 'blockquote':
        parts.push(`<blockquote><p>${renderInline(block)}</p></blockquote>`)
        break
      default:
        parts.push(`<p>${renderInline(block)}</p>`)
    }
    i++
  }

  return parts.join('')
}

function renderInline(block: SanityBlock): string {
  return block.children
    .map((span) => {
      let text = escapeHtml(span.text)
      if (!text) return ''
      const marks = span.marks ?? []

      // Apply link mark first (outermost)
      const linkKey = marks.find((m) =>
        block.markDefs.some((def) => def._key === m && def._type === 'link'),
      )
      if (linkKey) {
        const def = block.markDefs.find((d) => d._key === linkKey)!
        text = `<a href="${escapeHtml(def.href ?? '')}" rel="noopener noreferrer">${text}</a>`
      }

      if (marks.includes('strong')) text = `<strong>${text}</strong>`
      if (marks.includes('em')) text = `<em>${text}</em>`
      if (marks.includes('code')) text = `<code>${text}</code>`

      return text
    })
    .join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Queries ───────────────────────────────────────────────────────────────────

/** Fetch list of blog documents (title + enough body blocks for 50-word preview). */
export async function fetchBlogDocuments(): Promise<BlogDocument[]> {
  return sanityClient.fetch(`
    *[_type == "blog"] | order(_updatedAt desc) {
      _id,
      title,
      _updatedAt,
      "body": body[_type == "block"][0..10]
    }
  `)
}

/** Fetch the full body of a single document for editing. */
export async function fetchBlogDocument(id: string): Promise<BlogDocument> {
  return sanityClient.fetch(
    `*[_type == "blog" && _id == $id][0]{ _id, title, _updatedAt, body }`,
    { id },
  )
}
