import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig, isDraftDocumentId, toPublishedDocumentId } from '../config/runtime.js'

function relatedDocumentIds(id: string): [string, string] {
  if (isDraftDocumentId(id)) {
    return [id, toPublishedDocumentId(id)]
  }

  const draftId = `${getApiRuntimeConfig().content.draftPrefix}${id}`
  return [draftId, id]
}

app.http('deleteDocument', {
  methods: ['DELETE'],
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
      const client = getSanityClient()
      const candidateIds = relatedDocumentIds(id)
      const existingDocuments = await Promise.all(candidateIds.map((documentId) => client.getDocument(documentId)))
      const existingIds = candidateIds.filter((_documentId, index) => Boolean(existingDocuments[index]))

      if (existingIds.length === 0) {
        return { status: 404, jsonBody: { error: 'Document not found' } }
      }

      const transaction = existingIds.reduce(
        (builder, documentId) => builder.delete(documentId),
        client.transaction(),
      )

      await transaction.commit()
      return { status: 204 }
    } catch (err) {
      console.error('[deleteDocument]', err)
      return { status: 502, jsonBody: { error: 'Failed to delete document' } }
    }
  },
})
