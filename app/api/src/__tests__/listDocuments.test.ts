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
  await import('../functions/listDocuments.js')
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

function makeRequest(authenticated = true): HttpRequest {
  return {
    headers: {
      get: (name: string) =>
        name === 'x-ms-client-principal' ? (authenticated ? 'header' : null) : null,
    },
    params: {},
  } as unknown as HttpRequest
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('listDocuments handler', () => {
  beforeEach(() => {
    vi.mocked(parseClientPrincipal).mockReturnValue(VALID_PRINCIPAL)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(parseClientPrincipal).mockReturnValue(null)
    const res = await getHandler()(makeRequest(false))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 200 with blog documents', async () => {
    const mockDocs = [
      { _id: 'drafts.abc', _createdAt: '2024-01-02', _updatedAt: '2024-01-03', title: 'Draft Post', body: [] },
      { _id: 'def', _createdAt: '2024-01-01', _updatedAt: '2024-01-01', publishedAt: '2024-01-01', title: 'Published Post', body: [] },
    ]
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockResolvedValue(mockDocs),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual(mockDocs)
  })

  it('returns 200 with empty array when no documents exist', async () => {
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockResolvedValue([]),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual([])
  })

  it('returns 502 when Sanity fetch throws', async () => {
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockRejectedValue(new Error('GROQ error')),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'GROQ error' })
  })

  it('passes a GROQ query that filters by blog type', async () => {
    const mockFetch = vi.fn().mockResolvedValue([])
    vi.mocked(getSanityClient).mockReturnValue({ fetch: mockFetch } as any)

    await getHandler()(makeRequest())

    const query = mockFetch.mock.calls[0][0] as string
    expect(query).toContain('_type == "blog"')
    expect(query).toContain('order(')
  })
})
