import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

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
  parseClientPrincipal: vi.fn(),
}))

beforeAll(async () => {
  await import('../functions/publishDocument.js')
})

// ── Constants ─────────────────────────────────────────────────────────────────

const DRAFT_ID = 'drafts.550e8400-e29b-41d4-a716-446655440000'
const PUBLISHED_ID = '550e8400-e29b-41d4-a716-446655440000'

const MOCK_DRAFT = {
  _id: DRAFT_ID,
  _type: 'blog',
  _rev: 'rev-original',
  title: 'My Draft Post',
  slug: { _type: 'slug', current: 'my-draft-post' },
}

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(options: { params?: Record<string, string> }): HttpRequest {
  return {
    headers: { get: (_name: string) => null },
    params: options.params ?? {},
  } as unknown as HttpRequest
}

function makeTransactionClient(opts?: {
  draftDocument?: object | null
  commitThrows?: boolean
}) {
  const commit = opts?.commitThrows
    ? vi.fn().mockRejectedValue(new Error('Transaction failed'))
    : vi.fn().mockResolvedValue({ transactionId: 'tx-publish-123' })
  const deleteFn = vi.fn().mockReturnValue({ commit })
  const createOrReplace = vi.fn().mockReturnValue({ delete: deleteFn })
  const transaction = vi.fn().mockReturnValue({ createOrReplace })
  const getDocument = vi.fn().mockResolvedValue(
    opts?.draftDocument !== undefined ? opts.draftDocument : MOCK_DRAFT,
  )
  return { getDocument, transaction, createOrReplace, deleteFn, commit }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('publishDocument handler', () => {
  beforeEach(() => {
    vi.mocked(parseClientPrincipal).mockReturnValue(VALID_PRINCIPAL)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(parseClientPrincipal).mockReturnValue(null)
    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 400 when document ID is missing', async () => {
    const res = await getHandler()(makeRequest({ params: {} }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Missing document ID' })
  })

  it('returns 400 when document is not a draft', async () => {
    const res = await getHandler()(makeRequest({ params: { id: 'not-a-draft-id' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Document is not a draft' })
  })

  it('returns 404 when draft document does not exist in Sanity', async () => {
    const { getDocument, transaction } = makeTransactionClient({ draftDocument: null })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(404)
    expect(res.jsonBody).toEqual({ error: 'Draft not found' })
  })

  it('fetches the draft by ID before publishing', async () => {
    const { getDocument, transaction } = makeTransactionClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(getDocument).toHaveBeenCalledWith(DRAFT_ID)
  })

  it('creates the published document and deletes the draft atomically', async () => {
    const { getDocument, transaction, createOrReplace, deleteFn, commit } = makeTransactionClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    expect(transaction).toHaveBeenCalled()
    expect(createOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ _id: PUBLISHED_ID, _type: 'blog', title: 'My Draft Post' }),
    )
    expect(deleteFn).toHaveBeenCalledWith(DRAFT_ID)
    expect(commit).toHaveBeenCalled()
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual({ _id: PUBLISHED_ID, transactionId: 'tx-publish-123' })
  })

  it('strips _id and _rev from the published document', async () => {
    const { getDocument, transaction, createOrReplace } = makeTransactionClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    const published = vi.mocked(createOrReplace).mock.calls[0][0] as Record<string, unknown>
    expect(published['_id']).toBe(PUBLISHED_ID)
    expect(published['_rev']).toBeUndefined()
  })

  it('derives the published ID by stripping "drafts." prefix', async () => {
    const { getDocument, transaction, createOrReplace } = makeTransactionClient()
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))

    const published = vi.mocked(createOrReplace).mock.calls[0][0] as Record<string, unknown>
    expect(published['_id']).toBe(PUBLISHED_ID)
  })

  it('returns 502 when the Sanity transaction fails', async () => {
    const { getDocument, transaction } = makeTransactionClient({ commitThrows: true })
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to publish document' })
  })

  it('returns 502 with generic message for non-Error throws', async () => {
    const commit = vi.fn().mockRejectedValue('string error')
    const deleteFn = vi.fn().mockReturnValue({ commit })
    const createOrReplace = vi.fn().mockReturnValue({ delete: deleteFn })
    const transaction = vi.fn().mockReturnValue({ createOrReplace })
    const getDocument = vi.fn().mockResolvedValue(MOCK_DRAFT)
    vi.mocked(getSanityClient).mockReturnValue({ getDocument, transaction } as any)

    const res = await getHandler()(makeRequest({ params: { id: DRAFT_ID } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to publish document' })
  })
})
