import type { SanityClient } from '@sanity/client'

interface SlugLookupOptions {
  documentType: string
  slugField: string
  slug: string
  excludeIds?: string[]
}

const FIELD_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/

export async function findSlugConflictId(
  client: SanityClient,
  options: SlugLookupOptions,
): Promise<string | null> {
  const slugField = options.slugField.trim()
  if (!FIELD_NAME_RE.test(slugField)) {
    throw new Error(`Invalid slug field name: ${options.slugField}`)
  }

  const query = `*[
    _type == $documentType
    && ${slugField}.current == $slug
    && !(_id in $excludeIds)
  ][0]._id`

  const conflict = await client.fetch<string | null>(query, {
    documentType: options.documentType,
    slug: options.slug,
    excludeIds: options.excludeIds ?? [],
  })
  return conflict ?? null
}
