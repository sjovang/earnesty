import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { isDraftDocumentId, toPublishedDocumentId } from '../config/runtime.js'

app.http('publishDocument', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sanity/documents/{id}/publish',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    const id = request.params['id']
    if (!id) {
      return { status: 400, jsonBody: { error: 'Missing document ID' } }
    }

    if (!isDraftDocumentId(id)) {
      return { status: 400, jsonBody: { error: 'Document is not a draft' } }
    }

    try {
      const draft = await getSanityClient().getDocument(id)
      if (!draft) {
        return { status: 404, jsonBody: { error: 'Draft not found' } }
      }

      const publishedId = toPublishedDocumentId(id)

      // Copy the draft content to the published document and delete the draft
      // in a single transaction so Sanity never sees an inconsistent state.
      const { _id: _draftId, _rev: _draftRev, ...fields } = draft
      const published = await getSanityClient()
        .transaction()
        .createOrReplace({ ...fields, _id: publishedId })
        .delete(id)
        .commit()

      return {
        status: 200,
        jsonBody: {
          _id: publishedId,
          transactionId: published.transactionId,
        },
      }
    } catch (err) {
      console.error('[publishDocument]', err)
      return { status: 502, jsonBody: { error: 'Failed to publish document' } }
    }
  },
})
