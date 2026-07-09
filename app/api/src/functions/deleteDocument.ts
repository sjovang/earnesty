import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig, isDraftDocumentId, toPublishedDocumentId } from '../config/runtime.js'

function toRelatedDocumentIds(id: string): { draftId: string; publishedId: string } {
  if (isDraftDocumentId(id)) {
    return { draftId: id, publishedId: toPublishedDocumentId(id) }
  }

  return {
    draftId: `${getApiRuntimeConfig().content.draftPrefix}${id}`,
    publishedId: id,
  }
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
      const { draftId, publishedId } = toRelatedDocumentIds(id)
      const [draft, published] = await Promise.all([
        client.getDocument(draftId),
        client.getDocument(publishedId),
      ])

      if (!draft && !published) {
        return { status: 404, jsonBody: { error: 'Document not found' } }
      }

      if (published) {
        const { _id: _publishedId, _rev: _publishedRev, ...fields } = published
        await client
          .transaction()
          .createOrReplace({ ...fields, _id: draftId })
          .delete(publishedId)
          .commit()
      } else if (draft) {
        await client.delete(draftId)
      }

      return { status: 204 }
    } catch (err) {
      console.error('[deleteDocument]', err)
      return { status: 502, jsonBody: { error: 'Failed to delete document' } }
    }
  },
})
