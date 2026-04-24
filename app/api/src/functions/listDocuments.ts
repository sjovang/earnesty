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

    const docType = process.env['SANITY_DOCUMENT_TYPE'] ?? 'blog'

    try {
      const docs = await getSanityClient().fetch(
        `*[_type == $docType] | order(coalesce(publishedAt, _createdAt) desc) {
          _id,
          _createdAt,
          _updatedAt,
          publishedAt,
          title,
          "body": body[_type == "block"][0..10]
        }`,
        { docType },
      )
      return { status: 200, jsonBody: docs }
    } catch (err) {
      console.error('[listDocuments]', err)
      return { status: 502, jsonBody: { error: 'Failed to list documents' } }
    }
  },
})
