import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

// vi.hoisted() ensures these helpers exist when the vi.mock() factory runs.
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
  await import('../functions/saveDocument.js')
})

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(options: {
  params?: Record<string, string>
  body?: unknown
  jsonThrows?: boolean
}): HttpRequest {
  return {
    headers: { get: (_name: string) => null },
    params: options.params ?? {},
    json: options.jsonThrows
      ? vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      : vi.fn().mockResolvedValue(options.body),
  } as unknown as HttpRequest
}

function makePatchClient(opts?: { commitThrows?: boolean }) {
  const commit = opts?.commitThrows
    ? vi.fn().mockRejectedValue(new Error('Sanity write failed'))
    : vi.fn().mockResolvedValue({ transactionId: 'tx-123' })
  const set = vi.fn().mockReturnValue({ commit })
  const patch = vi.fn().mockReturnValue({ set })
  return { patch, set, commit }
}

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('saveDocument handler', () => {
  beforeEach(() => {
    vi.mocked(parseClientPrincipal).mockReturnValue(VALID_PRINCIPAL)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(parseClientPrincipal).mockReturnValue(null)
    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' } }))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 400 when document ID is missing', async () => {
    const res = await getHandler()(makeRequest({ params: {} }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Missing document ID' })
  })

  it('returns 400 when request body is invalid JSON', async () => {
    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, jsonThrows: true }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Invalid JSON body' })
  })

  it('returns 400 when blocks is not an array', async () => {
    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks: 'not an array' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"blocks" must be an array of PortableText blocks' })
  })

  it('returns 400 when title is provided but not a string', async () => {
    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks: [], title: 42 } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"title" must be a string when provided' })
  })

  it('saves blocks without title and returns 204', async () => {
    const { patch, set, commit } = makePatchClient()
    vi.mocked(getSanityClient).mockReturnValue({ patch } as any)

    const blocks = [{ _type: 'block', children: [] }]
    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks } }))

    expect(patch).toHaveBeenCalledWith('doc-123')
    expect(set).toHaveBeenCalledWith({ body: blocks })
    expect(commit).toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('saves blocks with title and returns 204', async () => {
    const { patch, set, commit } = makePatchClient()
    vi.mocked(getSanityClient).mockReturnValue({ patch } as any)

    const blocks = [{ _type: 'block', children: [] }]
    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks, title: 'My Post' } }))

    expect(set).toHaveBeenCalledWith({ body: blocks, title: 'My Post' })
    expect(commit).toHaveBeenCalled()
    expect(res.status).toBe(204)
  })

  it('does not include title field when title is undefined', async () => {
    const { patch, set } = makePatchClient()
    vi.mocked(getSanityClient).mockReturnValue({ patch } as any)

    await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks: [] } }))

    const setArg = vi.mocked(set).mock.calls[0][0] as Record<string, unknown>
    expect(setArg).not.toHaveProperty('title')
  })

  it('returns 502 when Sanity client throws', async () => {
    const { patch } = makePatchClient({ commitThrows: true })
    vi.mocked(getSanityClient).mockReturnValue({ patch } as any)

    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks: [] } }))

    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Sanity write failed' })
  })

  it('returns 502 with generic message for non-Error throws', async () => {
    const commit = vi.fn().mockRejectedValue('string error')
    const set = vi.fn().mockReturnValue({ commit })
    const patch = vi.fn().mockReturnValue({ set })
    vi.mocked(getSanityClient).mockReturnValue({ patch } as any)

    const res = await getHandler()(makeRequest({ params: { id: 'doc-123' }, body: { blocks: [] } }))

    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Unknown error' })
  })
})
