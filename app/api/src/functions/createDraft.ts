import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'

app.http('createDraft', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sanity/documents',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    let body: { title: unknown; slug: unknown }
    try {
      body = (await request.json()) as { title: unknown; slug: unknown }
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
      const client = getSanityClient()
      const id = `${config.content.draftPrefix}${crypto.randomUUID()}`
      const createPayload: Record<string, unknown> = {
        _id: id,
        _type: config.content.documentType,
        [config.content.titleField]: body.title.trim(),
        [config.content.slugField]: { _type: 'slug', current: body.slug.trim() },
      }
      const doc = await client.create(createPayload as Parameters<typeof client.create>[0])
      return { status: 201, jsonBody: doc }
    } catch (err) {
      console.error('[createDraft]', err)
      return { status: 502, jsonBody: { error: 'Failed to create draft' } }
    }
  },
})
