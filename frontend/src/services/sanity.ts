import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset: import.meta.env.VITE_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
})

export interface SanityBlock {
  _type: 'block'
  children: Array<{ text?: string }>
}

export interface BlogDocument {
  _id: string
  title: string
  _updatedAt: string
  bodyBlocks?: SanityBlock[]
}

/** Returns first 50 words of body, stripping all PortableText markup. */
export function extractPreview(blocks: SanityBlock[] | undefined): string {
  if (!blocks?.length) return ''
  const text = blocks
    .flatMap((b) => b.children.map((c) => c.text ?? ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
  const words = text.split(' ')
  return words.slice(0, 50).join(' ') + (words.length > 50 ? '…' : '')
}

export async function fetchBlogDocuments(): Promise<BlogDocument[]> {
  return sanityClient.fetch(`
    *[_type == "blog"] | order(_updatedAt desc) {
      _id,
      title,
      _updatedAt,
      "bodyBlocks": body[_type == "block"][0..4]
    }
  `)
}
