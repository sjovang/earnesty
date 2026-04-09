import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

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
      const docs = await getSanityClient().fetch(
        `*[_type == "blog"] | order(coalesce(publishedAt, _createdAt) desc) {
          _id,
          _createdAt,
          _updatedAt,
          publishedAt,
          title,
          "body": body[_type == "block"][0..10]
        }`,
      )
      return { status: 200, jsonBody: docs }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      return { status: 502, jsonBody: { error: message } }
    }
  },
})
