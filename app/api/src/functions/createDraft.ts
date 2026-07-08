import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig, getContentTypeConfig } from '../config/runtime.js'
import { findSlugConflictId } from '../slugUniqueness.js'

app.http('createDraft', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sanity/documents',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    let body: { title: unknown; slug: unknown; documentType?: unknown }
    try {
      body = (await request.json()) as { title: unknown; slug: unknown; documentType?: unknown }
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { status: 400, jsonBody: { error: '"title" is required' } }
    }
    if (typeof body.slug !== 'string' || !body.slug.trim()) {
      return { status: 400, jsonBody: { error: '"slug" is required' } }
    }

    try {
      const config = getApiRuntimeConfig()
      const requestedType = typeof body.documentType === 'string' && body.documentType.trim()
        ? body.documentType.trim()
        : config.content.defaultType
      if (!config.content.types[requestedType]) {
        return { status: 400, jsonBody: { error: '"documentType" is invalid' } }
      }
      const typeConfig = getContentTypeConfig(requestedType)
      const client = getSanityClient()
      const normalizedSlug = body.slug.trim()
      const existingSlugId = await findSlugConflictId(client, {
        documentType: typeConfig.name,
        slugField: typeConfig.slugField,
        slug: normalizedSlug,
      })
      if (existingSlugId) {
        return { status: 409, jsonBody: { error: '"slug" must be unique for this content type' } }
      }
      const id = `${config.content.draftPrefix}${crypto.randomUUID()}`
      const createPayload: Record<string, unknown> = {
        _id: id,
        _type: typeConfig.name,
        [typeConfig.titleField]: body.title.trim(),
        [typeConfig.slugField]: { _type: 'slug', current: normalizedSlug },
      }
      const doc = await client.create(createPayload as Parameters<typeof client.create>[0])
      return {
        status: 201,
        jsonBody: {
          _id: doc._id,
          _type: typeConfig.name,
          _createdAt: doc._createdAt,
          _updatedAt: doc._updatedAt,
          title: doc[typeConfig.titleField as keyof typeof doc] ?? body.title.trim(),
          publishedAt: doc[typeConfig.publishedAtField as keyof typeof doc] ?? null,
          body: doc[typeConfig.bodyField as keyof typeof doc] ?? [],
        },
      }
    } catch (err) {
      console.error('[createDraft]', err)
      return { status: 502, jsonBody: { error: 'Failed to create draft' } }
    }
  },
})
