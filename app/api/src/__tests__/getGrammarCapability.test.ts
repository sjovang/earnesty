import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { requireAuthenticatedPrincipal } from '../shared.js'
import { clearApiRuntimeConfigCache } from '../config/runtime.js'

const { getHandler, setHandler } = vi.hoisted(() => {
  let _handler: ((req: HttpRequest) => Promise<HttpResponseInit>) | null = null
  return {
    getHandler: () => _handler!,
    setHandler: (handler: (req: HttpRequest) => Promise<HttpResponseInit>) => {
      _handler = handler
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

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

beforeAll(async () => {
  await import('../functions/getGrammarCapability.js')
})

function makeRequest(): HttpRequest {
  return {
    headers: { get: (_name: string) => null },
    params: {},
  } as unknown as HttpRequest
}

describe('getGrammarCapability handler', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
    }
    clearApiRuntimeConfigCache()
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  afterEach(() => {
    process.env = originalEnv
    clearApiRuntimeConfigCache()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({
      response: { status: 401, jsonBody: { error: 'Not authenticated' } },
    })

    const response = await getHandler()(makeRequest())
    expect(response.status).toBe(401)
  })

  it('returns unavailable when key is required but missing', async () => {
    process.env['GRAMMAR_REQUIRE_API_KEY'] = 'true'
    delete process.env['GRAMMAR_API_KEY']
    clearApiRuntimeConfigCache()

    const response = await getHandler()(makeRequest())
    expect(response.status).toBe(200)
    expect(response.jsonBody).toEqual({
      advancedAvailable: false,
      reason: 'missing_api_key',
    })
  })

  it('returns available when key requirement is disabled', async () => {
    process.env['GRAMMAR_REQUIRE_API_KEY'] = 'false'
    clearApiRuntimeConfigCache()

    const response = await getHandler()(makeRequest())
    expect(response.status).toBe(200)
    expect(response.jsonBody).toEqual({
      advancedAvailable: true,
    })
  })
})
