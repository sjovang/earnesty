import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

app.http('createDraft', {
  methods: ['POST'],
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

    let body: { title: unknown; slug: unknown }
    try {
      body = (await request.json()) as { title: unknown; slug: unknown }
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    if (typeof body.title !== 'string' || !body.title.trim()) {
      return { status: 400, jsonBody: { error: '"title" is required' } }
    }
    if (typeof body.slug !== 'string' || !body.slug.trim()) {
      return { status: 400, jsonBody: { error: '"slug" is required' } }
    }

    const docType = process.env['SANITY_DOCUMENT_TYPE'] ?? 'blog'

    try {
      const id = `drafts.${crypto.randomUUID()}`
      const doc = await getSanityClient().create({
        _id: id,
        _type: docType,
        title: body.title.trim(),
        slug: { _type: 'slug', current: body.slug.trim() },
      })
      return { status: 201, jsonBody: doc }
    } catch (err) {
      console.error('[createDraft]', err)
      return { status: 502, jsonBody: { error: 'Failed to create draft' } }
    }
  },
})
