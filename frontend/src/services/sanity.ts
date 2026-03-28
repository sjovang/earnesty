import { createClient } from '@sanity/client'

// In development the Vite server proxies /v2024-01-01/… to the real Sanity
// API, avoiding the CORS restriction on localhost. In production the client
// talks directly to Sanity's CDN/API.
const devProxyConfig = import.meta.env.DEV
  ? { apiHost: window.location.origin, useProjectHostname: false, useCdn: false }
  : { useCdn: true }

export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  ...devProxyConfig,
})

/** Write client — requires VITE_SANITY_TOKEN with editor role. */
export const sanityWriteClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: import.meta.env.VITE_SANITY_TOKEN,
  ...devProxyConfig,
})

export function hasWriteAccess(): boolean {
  return !!import.meta.env.VITE_SANITY_TOKEN
}

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

export interface SanityImageBlock {
  _key: string
  _type: 'image'
  asset: { _ref: string; _type: 'reference' }
  alt?: string
}

export interface SanityCodeBlock {
  _key: string
  _type: 'code'
  code: string
  language?: string
  filename?: string
}

export type SanityBodyBlock = SanityBlock | SanityImageBlock | SanityCodeBlock

export interface BlogDocument {
  _id: string
  _updatedAt: string
  title: string
  body?: SanityBodyBlock[]
}

/** Converts a Sanity image asset ref to a CDN URL. */
export function buildSanityImageUrl(ref: string): string {
  const projectId = import.meta.env.VITE_SANITY_PROJECT_ID
  const dataset = import.meta.env.VITE_SANITY_DATASET ?? 'production'
  // ref format: "image-{id}-{WxH}-{ext}"  →  "{id}-{WxH}.{ext}"
  const filename = ref.replace(/^image-/, '').replace(/-([a-z0-9]+)$/i, '.$1')
  return `https://cdn.sanity.io/images/${projectId}/${dataset}/${filename}`
}

/** Returns the first paragraph — or first 50 words if that paragraph is longer. */
export function extractPreview(blocks: SanityBodyBlock[] | undefined): string {
  if (!blocks?.length) return ''

  const first = blocks.find(
    (b) => b._type === 'block' && (b as SanityBlock).children.some((c) => c.text?.trim()),
  ) as SanityBlock | undefined
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
export function portableTextToHtml(blocks: SanityBodyBlock[] | undefined): string {
  if (!blocks?.length) return '<p></p>'

  const parts: string[] = []
  let i = 0

  while (i < blocks.length) {
    const block = blocks[i]

    // Image block
    if (block._type === 'image') {
      const img = block as SanityImageBlock
      const src = buildSanityImageUrl(img.asset._ref)
      const alt = escapeHtml(img.alt ?? '')
      parts.push(`<img src="${src}" alt="${alt}" />`)
      i++
      continue
    }

    // Code block (from @sanity/code-input)
    if (block._type === 'code') {
      const cb = block as SanityCodeBlock
      const lang = cb.language ? ` class="language-${escapeHtml(cb.language)}"` : ''
      parts.push(`<pre><code${lang}>${escapeHtml(cb.code)}</code></pre>`)
      i++
      continue
    }

    const textBlock = block as SanityBlock

    // List items — collect consecutive items of the same list type
    if (textBlock.listItem) {
      const tag = textBlock.listItem === 'bullet' ? 'ul' : 'ol'
      const items: string[] = []
      while (
        i < blocks.length &&
        blocks[i]._type === 'block' &&
        (blocks[i] as SanityBlock).listItem === textBlock.listItem
      ) {
        items.push(`<li>${renderInline(blocks[i] as SanityBlock)}</li>`)
        i++
      }
      parts.push(`<${tag}>${items.join('')}</${tag}>`)
      continue
    }

    // Regular text blocks
    switch (textBlock.style) {
      case 'h1':
        parts.push(`<h1>${renderInline(textBlock)}</h1>`)
        break
      case 'h2':
        parts.push(`<h2>${renderInline(textBlock)}</h2>`)
        break
      case 'h3':
      case 'h4':
        parts.push(`<h3>${renderInline(textBlock)}</h3>`)
        break
      case 'blockquote':
        parts.push(`<blockquote><p>${renderInline(textBlock)}</p></blockquote>`)
        break
      default:
        parts.push(`<p>${renderInline(textBlock)}</p>`)
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

/**
 * Creates a new blog draft in Sanity.
 * Draft documents have an _id prefixed with "drafts." so they are not
 * published until explicitly promoted to a live document.
 */
export async function createDraftBlogDocument(
  title: string,
  slug: string,
): Promise<BlogDocument> {
  const id = `drafts.${crypto.randomUUID()}`
  return sanityWriteClient.create({
    _id: id,
    _type: 'blog',
    title,
    slug: { _type: 'slug', current: slug },
  }) as Promise<BlogDocument>
}
