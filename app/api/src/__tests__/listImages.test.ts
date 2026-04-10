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
  await import('../functions/listImages.js')
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

describe('listImages handler', () => {
  beforeEach(() => {
    vi.mocked(parseClientPrincipal).mockReturnValue(VALID_PRINCIPAL)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(parseClientPrincipal).mockReturnValue(null)
    const res = await getHandler()(makeRequest(false))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 200 with mapped image assets', async () => {
    const rawAssets = [
      { _id: 'image-abc-800x600-jpg', url: 'https://cdn.sanity.io/a.jpg', width: 800, height: 600 },
      { _id: 'image-def-1920x1080-png', url: 'https://cdn.sanity.io/b.png', width: 1920, height: 1080 },
    ]
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockResolvedValue(rawAssets),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual([
      { assetRef: 'image-abc-800x600-jpg', url: 'https://cdn.sanity.io/a.jpg', width: 800, height: 600 },
      { assetRef: 'image-def-1920x1080-png', url: 'https://cdn.sanity.io/b.png', width: 1920, height: 1080 },
    ])
  })

  it('returns 200 with empty array when no images exist', async () => {
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockResolvedValue([]),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual([])
  })

  it('returns 200 with null dimensions when metadata is missing', async () => {
    const rawAssets = [
      { _id: 'image-abc-800x600-jpg', url: 'https://cdn.sanity.io/a.jpg', width: null, height: null },
    ]
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockResolvedValue(rawAssets),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual([
      { assetRef: 'image-abc-800x600-jpg', url: 'https://cdn.sanity.io/a.jpg', width: null, height: null },
    ])
  })

  it('returns 502 when Sanity fetch throws', async () => {
    vi.mocked(getSanityClient).mockReturnValue({
      fetch: vi.fn().mockRejectedValue(new Error('GROQ error')),
    } as any)

    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to list images' })
  })
})
