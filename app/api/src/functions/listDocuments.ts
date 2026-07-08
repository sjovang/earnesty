import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'
import { buildListDocumentsQuery } from '../contentQuery.js'

app.http('listDocuments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sanity/documents',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    try {
      const config = getApiRuntimeConfig()
      const docs = await getSanityClient().fetch(buildListDocumentsQuery(config))
      return { status: 200, jsonBody: docs }
    } catch (err) {
      console.error('[listDocuments]', err)
      return { status: 502, jsonBody: { error: 'Failed to list documents' } }
    }
  },
})
