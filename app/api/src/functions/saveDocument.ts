import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

app.http('saveDocument', {
  methods: ['PATCH'],
  authLevel: 'anonymous',
  route: 'sanity/documents/{id}',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const principal = parseClientPrincipal(
      request.headers.get('x-ms-client-principal'),
    )
    if (!principal) {
      return { status: 401, jsonBody: { error: 'Not authenticated' } }
    }

    const id = request.params['id']
    if (!id) {
      return { status: 400, jsonBody: { error: 'Missing document ID' } }
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
      const fields: Record<string, unknown> = {}
      if (Array.isArray(body.blocks)) {
        fields['body'] = body.blocks
      }
      if (typeof body.title === 'string') {
        fields['title'] = body.title
      }
      await getSanityClient().patch(id).set(fields).commit()
      return { status: 204 }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { status: 502, jsonBody: { error: message } }
    }
  },
})
