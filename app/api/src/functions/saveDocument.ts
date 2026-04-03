import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { sanityClient, parseClientPrincipal } from '../shared.js'

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

    let body: { blocks: unknown }
    try {
      body = (await request.json()) as { blocks: unknown }
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    if (!Array.isArray(body.blocks)) {
      return {
        status: 400,
        jsonBody: { error: '"blocks" must be an array of PortableText blocks' },
      }
    }

    try {
      await sanityClient.patch(id).set({ body: body.blocks }).commit()
      return { status: 204 }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { status: 502, jsonBody: { error: message } }
    }
  },
})
