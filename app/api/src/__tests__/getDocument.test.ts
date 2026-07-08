import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
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
  getSanityClient: vi.fn(),
  requireAuthenticatedPrincipal: vi.fn(),
}))

beforeAll(async () => {
  await import('../functions/getDocument.js')
})

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

function makeRequest(options?: { authenticated?: boolean; id?: string }): HttpRequest {
  return {
    headers: {
      get: (name: string) =>
        name === 'x-ms-client-principal' ? ((options?.authenticated ?? true) ? 'header' : null) : null,
    },
    params: options?.id ? { id: options.id } : {},
  } as unknown as HttpRequest
}

describe('getDocument handler', () => {
  beforeEach(() => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({
      response: { status: 401, jsonBody: { error: 'Not authenticated' } },
    })
    const res = await getHandler()(makeRequest({ authenticated: false }))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 400 when document ID is missing', async () => {
    const res = await getHandler()(makeRequest({ id: '' }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Missing document ID' })
  })

  it('returns 200 with the fetched document', async () => {
    const doc = {
      _id: 'drafts.abc',
      _createdAt: '2024-01-01',
      _updatedAt: '2024-01-02',
      publishedAt: null,
      title: 'Draft',
      body: [],
    }
    const fetch = vi.fn().mockResolvedValue(doc)
    vi.mocked(getSanityClient).mockReturnValue({ fetch } as any)

    const res = await getHandler()(makeRequest({ id: 'drafts.abc' }))
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual(doc)
    expect(fetch).toHaveBeenCalledWith(expect.stringContaining('_id == $id'), { id: 'drafts.abc' })
  })

  it('returns 200 with null when document does not exist', async () => {
    const fetch = vi.fn().mockResolvedValue(null)
    vi.mocked(getSanityClient).mockReturnValue({ fetch } as any)

    const res = await getHandler()(makeRequest({ id: 'missing-id' }))
    expect(res.status).toBe(200)
    expect(res.jsonBody).toBeNull()
  })

  it('returns 502 when Sanity fetch throws', async () => {
    const fetch = vi.fn().mockRejectedValue(new Error('GROQ error'))
    vi.mocked(getSanityClient).mockReturnValue({ fetch } as any)

    const res = await getHandler()(makeRequest({ id: 'drafts.abc' }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to fetch document' })
  })
})

describe('getDocument handler – custom schema mapping', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      SANITY_DOCUMENT_TYPE: 'article',
      SANITY_TITLE_FIELD: 'headline',
      SANITY_BODY_FIELD: 'content',
      SANITY_PUBLISHED_AT_FIELD: 'publishedOn',
    }
    clearApiRuntimeConfigCache()
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  afterEach(() => {
    process.env = originalEnv
    clearApiRuntimeConfigCache()
  })

  it('uses configured schema fields in query projection', async () => {
    const fetch = vi.fn().mockResolvedValue(null)
    vi.mocked(getSanityClient).mockReturnValue({ fetch } as any)

    await getHandler()(makeRequest({ id: 'drafts.abc' }))
    const query = fetch.mock.calls[0][0] as string
    expect(query).toContain('_type == "article"')
    expect(query).toContain('"title": headline')
    expect(query).toContain('"publishedAt": publishedOn')
    expect(query).toContain('"body": content')
  })
})
