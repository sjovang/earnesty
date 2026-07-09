import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { requireAuthenticatedPrincipal } from '../shared.js'
import { clearApiRuntimeConfigCache } from '../config/runtime.js'

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
  requireAuthenticatedPrincipal: vi.fn(),
}))

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeAll(async () => {
  await import('../functions/checkGrammar.js')
})

function makeRequest(options: { body?: unknown; jsonThrows?: boolean }): HttpRequest {
  return {
    headers: { get: (_name: string) => null },
    params: {},
    json: options.jsonThrows
      ? vi.fn().mockRejectedValue(new SyntaxError('Unexpected token'))
      : vi.fn().mockResolvedValue(options.body),
  } as unknown as HttpRequest
}

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

describe('checkGrammar handler', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    }
    clearApiRuntimeConfigCache()
    mockFetch.mockReset()
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  afterEach(() => {
    process.env = originalEnv
    clearApiRuntimeConfigCache()
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({
      response: { status: 401, jsonBody: { error: 'Not authenticated' } },
    })
    const res = await getHandler()(makeRequest({ body: { text: 'Hello world' } }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when JSON body is invalid', async () => {
    const res = await getHandler()(makeRequest({ jsonThrows: true }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Invalid JSON body' })
  })

  it('returns 400 when text is missing', async () => {
    const res = await getHandler()(makeRequest({ body: { language: 'en' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"text" is required' })
  })

  it('returns 400 when text is too long', async () => {
    const res = await getHandler()(makeRequest({ body: { text: 'a'.repeat(20_001) } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"text" exceeds 20000 characters' })
  })

  it('forwards request to grammar provider and returns normalized matches', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        matches: [
          {
            message: 'Possible agreement error',
            shortMessage: '',
            offset: 5,
            length: 3,
            replacements: [{ value: 'is' }],
            rule: { id: 'AGREEMENT', description: 'Agreement', issueType: 'grammar' },
          },
        ],
      }),
    })

    const res = await getHandler()(makeRequest({
      body: { text: 'This are wrong.', language: 'en' },
    }))

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.languagetool.org/v2/check',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual({
      language: 'en',
      matches: [
        {
          message: 'Possible agreement error',
          shortMessage: '',
          offset: 5,
          length: 3,
          replacements: [{ value: 'is' }],
          rule: { id: 'AGREEMENT', description: 'Agreement', issueType: 'grammar' },
        },
      ],
    })
  })

  it('returns 502 when provider responds with non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, json: vi.fn() })
    const res = await getHandler()(makeRequest({ body: { text: 'Hello world' } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Grammar service unavailable' })
  })

  it('returns 502 when provider call throws', async () => {
    mockFetch.mockRejectedValue(new Error('Network down'))
    const res = await getHandler()(makeRequest({ body: { text: 'Hello world' } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to check grammar' })
  })
})
