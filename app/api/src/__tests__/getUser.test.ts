import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { parseClientPrincipal } from '../shared.js'

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
  parseClientPrincipal: vi.fn(),
}))

beforeAll(async () => {
  await import('../functions/getUser.js')
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequest(): HttpRequest {
  return {
    headers: { get: (_name: string) => null },
    params: {},
  } as unknown as HttpRequest
}

const MOCK_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-abc-123',
  userDetails: 'user@example.com',
  userRoles: ['authenticated', 'anonymous'],
  claims: [{ typ: 'name', val: 'Test User' }],
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('getUser handler', () => {
  beforeEach(() => {
    vi.mocked(parseClientPrincipal).mockReturnValue(MOCK_PRINCIPAL)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(parseClientPrincipal).mockReturnValue(null)
    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 200 with user identity fields', async () => {
    const res = await getHandler()(makeRequest())
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual({
      identityProvider: 'aad',
      userId: 'user-abc-123',
      userDetails: 'user@example.com',
      userRoles: ['authenticated', 'anonymous'],
    })
  })

  it('does not expose claims in the response', async () => {
    const res = await getHandler()(makeRequest())
    expect(res.jsonBody).not.toHaveProperty('claims')
  })
})
