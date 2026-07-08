import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'
import { buildGetDocumentQuery } from '../contentQuery.js'

app.http('getDocument', {
  methods: ['GET'],
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

    try {
      const config = getApiRuntimeConfig()
      const doc = await getSanityClient().fetch(buildGetDocumentQuery(config), { id })
      return { status: 200, jsonBody: doc ?? null }
    } catch (err) {
      console.error('[getDocument]', err)
      return { status: 502, jsonBody: { error: 'Failed to fetch document' } }
    }
  },
})
