import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig, getContentTypeConfig, type MetadataFieldConfig } from '../config/runtime.js'

function normalizeMetadataFieldValue(
  field: MetadataFieldConfig,
  value: unknown,
): unknown {
  switch (field.type) {
    case 'string':
    case 'datetime':
      if (typeof value !== 'string') {
        throw new Error(`"${field.key}" must be a string`)
      }
      return value
    case 'slug':
      if (typeof value !== 'string') {
        throw new Error(`"${field.key}" must be a string`)
      }
      return { _type: 'slug', current: value.trim() }
    case 'stringArray':
      if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
        throw new Error(`"${field.key}" must be an array of strings`)
      }
      return value
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new Error(`"${field.key}" must be a boolean`)
      }
      return value
  }
}

app.http('saveDocument', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'sanity/documents/{id}',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    const id = request.params['id']
    if (!id) {
      return { status: 400, jsonBody: { error: 'Missing document ID' } }
    }

    const draftPrefix = getApiRuntimeConfig().content.draftPrefix
    const escapedPrefix = draftPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const DRAFT_ID_RE = new RegExp(
      `^${escapedPrefix}[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$`,
      'i',
    )
    if (!DRAFT_ID_RE.test(id)) {
      return { status: 400, jsonBody: { error: 'Invalid document ID' } }
    }

    let body: { blocks?: unknown; title?: unknown; metadata?: unknown }
    try {
      body = (await request.json()) as { blocks?: unknown; title?: unknown; metadata?: unknown }
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    if (body.blocks !== undefined && !Array.isArray(body.blocks)) {
      return {
        status: 400,
        jsonBody: { error: '"blocks" must be an array of PortableText blocks' },
      }
    }

    if (body.title !== undefined && typeof body.title !== 'string') {
      return {
        status: 400,
        jsonBody: { error: '"title" must be a string when provided' },
      }
    }

    if (
      body.metadata !== undefined
      && (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))
    ) {
      return {
        status: 400,
        jsonBody: { error: '"metadata" must be an object when provided' },
      }
    }

    if (body.blocks === undefined && body.title === undefined && body.metadata === undefined) {
      return {
        status: 400,
        jsonBody: { error: 'At least one of "blocks", "title", or "metadata" must be provided' },
      }
    }

    try {
      const config = getApiRuntimeConfig()
      const client = getSanityClient()
      const existing = await client.getDocument(id)
      if (!existing || typeof existing._type !== 'string') {
        return { status: 404, jsonBody: { error: 'Document not found' } }
      }
      const typeConfig = getContentTypeConfig(existing._type)
      const fields: Record<string, unknown> = {}
      if (Array.isArray(body.blocks)) {
        fields[typeConfig.bodyField] = body.blocks
      }
      if (typeof body.title === 'string') {
        fields[typeConfig.titleField] = body.title
      }
      if (body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)) {
        const fieldMap = new Map(typeConfig.metadataFields.map((field) => [field.key, field]))
        for (const [key, value] of Object.entries(body.metadata as Record<string, unknown>)) {
          const field = fieldMap.get(key)
          if (!field) {
            return { status: 400, jsonBody: { error: `"metadata.${key}" is not configured for this type` } }
          }
          try {
            fields[field.field] = normalizeMetadataFieldValue(field, value)
          } catch (error) {
            return {
              status: 400,
              jsonBody: { error: error instanceof Error ? error.message : `Invalid value for "${key}"` },
            }
          }
        }
      }
      await client.patch(id).set(fields).commit()
      return { status: 204 }
    } catch (err) {
      console.error('[saveDocument]', err)
      return { status: 502, jsonBody: { error: 'Failed to save document' } }
    }
  },
})
