import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'

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

    let body: { blocks?: unknown; title?: unknown }
    try {
      body = (await request.json()) as { blocks?: unknown; title?: unknown }
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

    if (body.blocks === undefined && body.title === undefined) {
      return {
        status: 400,
        jsonBody: { error: 'At least one of "blocks" or "title" must be provided' },
      }
    }

    try {
      const config = getApiRuntimeConfig()
      const fields: Record<string, unknown> = {}
      if (Array.isArray(body.blocks)) {
        fields[config.content.bodyField] = body.blocks
      }
      if (typeof body.title === 'string') {
        fields[config.content.titleField] = body.title
      }
      await getSanityClient().patch(id).set(fields).commit()
      return { status: 204 }
    } catch (err) {
      console.error('[saveDocument]', err)
      return { status: 502, jsonBody: { error: 'Failed to save document' } }
    }
  },
})
