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
  await import('../functions/createDraft.js')
})

// ── Helpers ───────────────────────────────────────────────────────────────────

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

const CREATED_DOC = {
  _id: 'drafts.550e8400-e29b-41d4-a716-446655440000',
  _type: 'blog',
  _createdAt: '2024-01-01T00:00:00.000Z',
  _updatedAt: '2024-01-01T00:00:00.000Z',
  title: 'My Post',
  slug: { _type: 'slug', current: 'my-post' },
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('createDraft handler', () => {
  beforeEach(() => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({
      response: { status: 401, jsonBody: { error: 'Not authenticated' } },
    })
    const res = await getHandler()(makeRequest({ body: { title: 'Test', slug: 'test' } }))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 400 when request body is invalid JSON', async () => {
    const res = await getHandler()(makeRequest({ jsonThrows: true }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Invalid JSON body' })
  })

  it('returns 400 when title is missing', async () => {
    const res = await getHandler()(makeRequest({ body: { slug: 'my-post' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"title" is required' })
  })

  it('returns 400 when title is empty string', async () => {
    const res = await getHandler()(makeRequest({ body: { title: '   ', slug: 'my-post' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"title" is required' })
  })

  it('returns 400 when title is not a string', async () => {
    const res = await getHandler()(makeRequest({ body: { title: 42, slug: 'my-post' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"title" is required' })
  })

  it('returns 400 when slug is missing', async () => {
    const res = await getHandler()(makeRequest({ body: { title: 'My Post' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"slug" is required' })
  })

  it('returns 400 when slug is empty string', async () => {
    const res = await getHandler()(makeRequest({ body: { title: 'My Post', slug: '   ' } }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: '"slug" is required' })
  })

  it('creates a draft with a "drafts." prefixed ID', async () => {
    const create = vi.fn().mockResolvedValue(CREATED_DOC)
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    await getHandler()(makeRequest({ body: { title: 'My Post', slug: 'my-post' } }))

    const doc = vi.mocked(create).mock.calls[0][0] as Record<string, unknown>
    expect(String(doc['_id'])).toMatch(/^drafts\./)
  })

  it('creates a draft with correct type, title, and slug', async () => {
    const create = vi.fn().mockResolvedValue(CREATED_DOC)
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    await getHandler()(makeRequest({ body: { title: 'My Post', slug: 'my-post' } }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        _type: 'blog',
        title: 'My Post',
        slug: { _type: 'slug', current: 'my-post' },
      }),
    )
  })

  it('trims whitespace from title and slug', async () => {
    const create = vi.fn().mockResolvedValue(CREATED_DOC)
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    await getHandler()(makeRequest({ body: { title: '  My Post  ', slug: '  my-post  ' } }))

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'My Post', slug: { _type: 'slug', current: 'my-post' } }),
    )
  })

  it('returns 201 with the created document', async () => {
    const create = vi.fn().mockResolvedValue(CREATED_DOC)
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    const res = await getHandler()(makeRequest({ body: { title: 'My Post', slug: 'my-post' } }))

    expect(res.status).toBe(201)
    expect(res.jsonBody).toEqual(
      expect.objectContaining({
        _id: CREATED_DOC._id,
        _type: CREATED_DOC._type,
        title: CREATED_DOC.title,
      }),
    )
  })

  it('returns 502 when Sanity client throws', async () => {
    const create = vi.fn().mockRejectedValue(new Error('Sanity create failed'))
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    const res = await getHandler()(makeRequest({ body: { title: 'My Post', slug: 'my-post' } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to create draft' })
  })

  it('returns 502 with generic message for non-Error throws', async () => {
    const create = vi.fn().mockRejectedValue('string error')
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    const res = await getHandler()(makeRequest({ body: { title: 'My Post', slug: 'my-post' } }))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Failed to create draft' })
  })
})

// ── Non-default schema mapping ────────────────────────────────────────────────

describe('createDraft handler – custom schema mapping', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      SANITY_SCHEMA_CONFIG: JSON.stringify({
        defaultType: 'article',
        types: [
          {
            name: 'article',
            titleField: 'headline',
            bodyField: 'content',
            slugField: 'path',
            publishedAtField: 'publishedOn',
          },
        ],
      }),
    }
    clearApiRuntimeConfigCache()
    vi.mocked(requireAuthenticatedPrincipal).mockReturnValue({ principal: VALID_PRINCIPAL })
  })

  afterEach(() => {
    process.env = originalEnv
    clearApiRuntimeConfigCache()
  })

  it('creates a draft with the configured document type', async () => {
    const create = vi.fn().mockResolvedValue({ _id: 'drafts.test-id', _type: 'article' })
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    await getHandler()(makeRequest({ body: { title: 'My Article', slug: 'my-article', documentType: 'article' } }))

    const doc = vi.mocked(create).mock.calls[0][0] as Record<string, unknown>
    expect(doc['_type']).toBe('article')
  })

  it('uses configured title and slug field names', async () => {
    const create = vi.fn().mockResolvedValue({ _id: 'drafts.test-id', _type: 'article' })
    vi.mocked(getSanityClient).mockReturnValue({ create } as any)

    await getHandler()(makeRequest({ body: { title: 'My Article', slug: 'my-article' } }))

    const doc = vi.mocked(create).mock.calls[0][0] as Record<string, unknown>
    expect(doc['headline']).toBe('My Article')
    expect(doc['path']).toMatchObject({ _type: 'slug', current: 'my-article' })
    expect(doc).not.toHaveProperty('title')
    expect(doc).not.toHaveProperty('slug')
  })
})
