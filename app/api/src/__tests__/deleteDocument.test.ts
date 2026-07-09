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

function makeDeleteClient(options?: {
  existingIds?: string[]
  commitThrows?: boolean
}) {
  const existingIds = new Set(options?.existingIds ?? [DRAFT_ID, PUBLISHED_ID])
  const commit = options?.commitThrows
    ? vi.fn().mockRejectedValue(new Error('Transaction failed'))
    : vi.fn().mockResolvedValue({ transactionId: 'tx-delete-123' })
  const deleteFn = vi.fn()
  const transaction = vi.fn().mockReturnValue({
    delete: deleteFn.mockImplementation(() => ({ delete: deleteFn, commit })),
  })
  const getDocument = vi.fn().mockImplementation(async (id: string) => (
    existingIds.has(id) ? { _id: id, _type: 'blog' } : null
  ))

  return { getDocument, transaction, deleteFn, commit }
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

  it('returns 404 when neither the draft nor published document exists', async () => {
    const { getDocument, transaction } = makeDeleteClient({ existingIds: [] })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(404)
    expect(res.jsonBody).toEqual({ error: 'Document not found' })
  })

  it('deletes both draft and published documents when given a draft ID', async () => {
    const { getDocument, transaction, deleteFn, commit } = makeDeleteClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    expect(getDocument).toHaveBeenCalledWith(DRAFT_ID)
    expect(getDocument).toHaveBeenCalledWith(PUBLISHED_ID)
    expect(transaction).toHaveBeenCalled()
    expect(deleteFn).toHaveBeenNthCalledWith(1, DRAFT_ID)
    expect(deleteFn).toHaveBeenNthCalledWith(2, PUBLISHED_ID)
    expect(commit).toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('deletes both draft and published documents when given a published ID', async () => {
    const { getDocument, transaction, deleteFn } = makeDeleteClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as never)

    await getHandler()(makeRequest({ params: { id: PUBLISHED_ID } }))

    expect(getDocument).toHaveBeenCalledWith(DRAFT_ID)
    expect(getDocument).toHaveBeenCalledWith(PUBLISHED_ID)
    expect(deleteFn).toHaveBeenNthCalledWith(1, DRAFT_ID)
    expect(deleteFn).toHaveBeenNthCalledWith(2, PUBLISHED_ID)
  })

  it('deletes only the draft when no published sibling exists', async () => {
    const { getDocument, transaction, deleteFn, commit } = makeDeleteClient({ existingIds: [DRAFT_ID] })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(deleteFn).toHaveBeenCalledWith(DRAFT_ID)
    expect(commit).toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('deletes only the published document when no draft sibling exists', async () => {
    const { getDocument, transaction, deleteFn, commit } = makeDeleteClient({ existingIds: [PUBLISHED_ID] })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as never)

    const res = await getHandler()(makeRequest({ params: { id: PUBLISHED_ID } }))

    expect(deleteFn).toHaveBeenCalledTimes(1)
    expect(deleteFn).toHaveBeenCalledWith(PUBLISHED_ID)
    expect(commit).toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('returns 502 when the Sanity transaction fails', async () => {
    const { getDocument, transaction } = makeDeleteClient({ commitThrows: true })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as never)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to delete document' })
  })
})
