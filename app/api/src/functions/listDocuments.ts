import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'

app.http('listDocuments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sanity/documents',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const principal = parseClientPrincipal(
      request.headers.get('x-ms-client-principal'),
    )
    if (!principal) {
      return { status: 401, jsonBody: { error: 'Not authenticated' } }
    }

    try {
      const config = getApiRuntimeConfig()
      const docs = await getSanityClient().fetch(
        `*[_type == "${config.content.documentType}"] | order(coalesce(${config.content.publishedAtField}, _createdAt) desc) {
          _id,
          _createdAt,
          _updatedAt,
          "publishedAt": ${config.content.publishedAtField},
          "title": ${config.content.titleField},
          "body": ${config.content.bodyField}[_type == "block"][0..10]
        }`,
      )
      return { status: 200, jsonBody: docs }
    } catch (err) {
      console.error('[listDocuments]', err)
      return { status: 502, jsonBody: { error: 'Failed to list documents' } }
    }
  },
})
