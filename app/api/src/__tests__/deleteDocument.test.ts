import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'

const { getHandler, setHandler } = vi.hoisted(() => {
  let _handler: ((req: HttpRequest) => Promise<HttpResponseInit>) | null = null
  return {
    getHandler: () => _handler!,
    setHandler: (h: (req: HttpRequest) => Promise<HttpResponseInit>) => {
      _handler = h
    },
  }
})

vi.mock('@azure/functions', () => ({
  app: {
    http: (_name: string, config: { handler: (req: HttpRequest) => Promise<HttpResponseInit> }) => {
      setHandler(config.handler)
    },
  },
}))

vi.mock('../shared.js', () => ({
  getSanityClient: vi.fn(),
  requireAuthenticatedPrincipal: vi.fn(),
}))

beforeAll(async () => {
  await import('../functions/deleteDocument.js')
})

const DRAFT_ID = 'drafts.550e8400-e29b-41d4-a716-446655440000'
const PUBLISHED_ID = '550e8400-e29b-41d4-a716-446655440000'

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

function makeRequest(options: { params?: Record<string, string> }): HttpRequest {
  return {
    headers: { get: (_name: string) => null },
    params: options.params ?? {},
  } as unknown as HttpRequest
}

function makeDocument(id: string, title: string) {
  return { _id: id, _type: 'blog', title, _createdAt: '2026-01-01', _updatedAt: '2026-01-01' }
}

function makeDeleteClient(options?: {
  draft?: Record<string, unknown> | null
  published?: Record<string, unknown> | null
  commitThrows?: boolean
  deleteThrows?: boolean
}) {
  const docs = new Map<string, Record<string, unknown>>()
  if (options?.draft) docs.set(DRAFT_ID, options.draft)
  if (options?.published) docs.set(PUBLISHED_ID, options.published)

  const commit = options?.commitThrows
    ? vi.fn().mockRejectedValue(new Error('Transaction failed'))
    : vi.fn().mockResolvedValue({ transactionId: 'tx-delete-123' })
  const tx = {
    createOrReplace: vi.fn(),
    delete: vi.fn(),
    commit,
  }
  tx.createOrReplace.mockImplementation(() => tx)
  tx.delete.mockImplementation(() => tx)

  const transaction = vi.fn().mockReturnValue(tx)
  const getDocument = vi.fn().mockImplementation(async (id: string) => docs.get(id) ?? null)
  const deleteDoc = options?.deleteThrows
    ? vi.fn().mockRejectedValue(new Error('Delete failed'))
    : vi.fn().mockResolvedValue({ _id: DRAFT_ID })

  return { getDocument, transaction, tx, deleteDoc, commit }
}

describe('deleteDocument handler', () => {
  beforeEach(() => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({
      response: { status: 401, jsonBody: { error: 'Not authenticated' } },
    })

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 400 when document ID is missing', async () => {
    const res = await getHandler()(makeRequest({ params: {} }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Missing document ID' })
  })

  it('returns 404 when neither draft nor published document exists', async () => {
    const { getDocument, transaction, deleteDoc } = makeDeleteClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction, delete: deleteDoc } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(404)
    expect(res.jsonBody).toEqual({ error: 'Document not found' })
  })

  it('permanently deletes a draft-only document', async () => {
    const draft = makeDocument(DRAFT_ID, 'Draft title')
    const { getDocument, transaction, deleteDoc, tx } = makeDeleteClient({ draft })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction, delete: deleteDoc } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    expect(deleteDoc).toHaveBeenCalledWith(DRAFT_ID)
    expect(transaction).not.toHaveBeenCalled()
    expect(tx.createOrReplace).not.toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('unpublishes a published-only document by moving it to draft', async () => {
    const published = makeDocument(PUBLISHED_ID, 'Published title')
    const { getDocument, transaction, deleteDoc, tx, commit } = makeDeleteClient({ published })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction, delete: deleteDoc } as never)

    const res = await getHandler()(makeRequest({ params: { id: PUBLISHED_ID } }))

    expect(transaction).toHaveBeenCalled()
    expect(tx.createOrReplace).toHaveBeenCalledWith(expect.objectContaining({
      _id: DRAFT_ID,
      _type: 'blog',
      title: 'Published title',
    }))
    expect(tx.delete).toHaveBeenCalledWith(PUBLISHED_ID)
    expect(commit).toHaveBeenCalled()
    expect(deleteDoc).not.toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('replaces existing draft with published content when both versions exist', async () => {
    const draft = makeDocument(DRAFT_ID, 'Draft changes')
    const published = makeDocument(PUBLISHED_ID, 'Published baseline')
    const { getDocument, transaction, deleteDoc, tx } = makeDeleteClient({ draft, published })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction, delete: deleteDoc } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    expect(tx.createOrReplace).toHaveBeenCalledWith(expect.objectContaining({
      _id: DRAFT_ID,
      title: 'Published baseline',
    }))
    expect(tx.delete).toHaveBeenCalledWith(PUBLISHED_ID)
    expect(deleteDoc).not.toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('returns 502 when unpublish transaction fails', async () => {
    const published = makeDocument(PUBLISHED_ID, 'Published title')
    const { getDocument, transaction, deleteDoc } = makeDeleteClient({ published, commitThrows: true })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction, delete: deleteDoc } as never)

    const res = await getHandler()(makeRequest({ params: { id: PUBLISHED_ID } }))

    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to delete document' })
  })

  it('returns 502 when deleting draft-only document fails', async () => {
    const draft = makeDocument(DRAFT_ID, 'Draft title')
    const { getDocument, transaction, deleteDoc } = makeDeleteClient({ draft, deleteThrows: true })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction, delete: deleteDoc } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to delete document' })
  })
})
