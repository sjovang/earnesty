import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  apiSaveDocument,
  apiPublishDocument,
  apiCreateDraft,
  apiGetDocument,
  apiCheckGrammar,
  AuthError,
  clearRedirectTimestamp,
  AUTH_REDIRECT_TS_KEY,
} from '../api.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(status: number, body?: unknown, type: ResponseType = 'basic'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    type,
    redirected: false,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockSessionStorage = {
  getItem: vi.fn(() => '0'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
}
vi.stubGlobal('sessionStorage', mockSessionStorage)

vi.stubGlobal('window', {
  location: { href: '', pathname: '/', search: '', hash: '' },
})

// ── AuthError ─────────────────────────────────────────────────────────────────

describe('AuthError', () => {
  it('is an instance of Error', () => {
    const err = new AuthError('test', false)
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AuthError)
  })

  it('sets name to AuthError', () => {
    const err = new AuthError('test', false)
    expect(err.name).toBe('AuthError')
  })

  it('exposes isRedirectSuppressed flag', () => {
    expect(new AuthError('msg', false).isRedirectSuppressed).toBe(false)
    expect(new AuthError('msg', true).isRedirectSuppressed).toBe(true)
  })
})

// ── clearRedirectTimestamp ────────────────────────────────────────────────────

describe('clearRedirectTimestamp', () => {
  it('removes the redirect timestamp from sessionStorage', () => {
    mockSessionStorage.removeItem.mockClear()
    clearRedirectTimestamp()
    expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(AUTH_REDIRECT_TS_KEY)
  })
})

// ── Auth redirect (401 / opaqueredirect) ──────────────────────────────────────

describe('apiFetch — auth redirect', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSessionStorage.getItem.mockReturnValue('0')
    mockSessionStorage.setItem.mockClear()
  })

  it('throws AuthError (not suppressed) on direct 401 without redirecting', async () => {
    mockFetch.mockResolvedValue(makeResponse(401))
    await expect(apiSaveDocument('doc-123', [])).rejects.toSatisfy(
      (e: unknown) => e instanceof AuthError && !e.isRedirectSuppressed,
    )
    // Direct 401 must NOT set the redirect timestamp
    expect(mockSessionStorage.setItem).not.toHaveBeenCalled()
  })

  it('throws AuthError (not suppressed) on opaqueredirect when no recent redirect', async () => {
    mockFetch.mockResolvedValue(makeResponse(0, undefined, 'opaqueredirect'))
    await expect(apiSaveDocument('doc-123', [])).rejects.toSatisfy(
      (e: unknown) => e instanceof AuthError && !e.isRedirectSuppressed,
    )
    expect(mockSessionStorage.setItem).toHaveBeenCalledWith(AUTH_REDIRECT_TS_KEY, expect.any(String))
  })

  it('throws AuthError (suppressed) on opaqueredirect when redirect was recent', async () => {
    mockSessionStorage.getItem.mockReturnValue(String(Date.now() - 1000))
    mockFetch.mockResolvedValue(makeResponse(0, undefined, 'opaqueredirect'))
    await expect(apiSaveDocument('doc-123', [])).rejects.toSatisfy(
      (e: unknown) => e instanceof AuthError && e.isRedirectSuppressed,
    )
  })
})

// ── apiSaveDocument ───────────────────────────────────────────────────────────

describe('apiSaveDocument', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends a PATCH request to the correct endpoint', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    await apiSaveDocument('doc-123', [])

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sanity/documents/doc-123',
      expect.objectContaining({ method: 'PATCH' }),
    )
  })

  it('encodes special characters in the document ID', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    await apiSaveDocument('drafts.some/id', [])

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain(encodeURIComponent('drafts.some/id'))
  })

  it('includes blocks in the request body', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    const blocks = [{ _type: 'block' as const, _key: 'k1', children: [], markDefs: [], style: 'normal' as const }]
    await apiSaveDocument('doc-123', blocks)

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.blocks).toEqual(blocks)
  })

  it('includes title in the request body when provided', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    await apiSaveDocument('doc-123', [], 'My Title')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.title).toBe('My Title')
  })

  it('omits title from the request body when not provided', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    await apiSaveDocument('doc-123', [])

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).not.toHaveProperty('title')
  })

  it('resolves without a value on 204 No Content', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    const result = await apiSaveDocument('doc-123', [])
    expect(result).toBeUndefined()
  })

  it('sends title-only request when blocks is undefined', async () => {
    mockFetch.mockResolvedValue(makeResponse(204))
    await apiSaveDocument('doc-123', undefined, 'New Title')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ title: 'New Title' })
    expect(body).not.toHaveProperty('blocks')
  })

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(makeResponse(502, { error: 'Server error' }))
    await expect(apiSaveDocument('doc-123', [])).rejects.toThrow('Server error')
  })
})

// ── apiPublishDocument ────────────────────────────────────────────────────────

describe('apiPublishDocument', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends a POST request to the publish endpoint', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { _id: 'doc-123', transactionId: 'tx-1' }))
    await apiPublishDocument('drafts.doc-123')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sanity/documents/drafts.doc-123/publish',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('returns the published document ID and transactionId', async () => {
    const payload = { _id: 'doc-123', transactionId: 'tx-456' }
    mockFetch.mockResolvedValue(makeResponse(200, payload))

    const result = await apiPublishDocument('drafts.doc-123')
    expect(result).toEqual(payload)
  })

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(makeResponse(400, { error: 'Document is not a draft' }))
    await expect(apiPublishDocument('not-a-draft')).rejects.toThrow('Document is not a draft')
  })
})

// ── apiCreateDraft ────────────────────────────────────────────────────────────

describe('apiCreateDraft', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends a POST request to the documents endpoint', async () => {
    const newDoc = { _id: 'drafts.uuid', _type: 'article', title: 'New Post', _createdAt: '', _updatedAt: '' }
    mockFetch.mockResolvedValue(makeResponse(201, newDoc))
    await apiCreateDraft('New Post', 'new-post')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sanity/documents',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends title and slug in the request body', async () => {
    const newDoc = { _id: 'drafts.uuid', _type: 'article', title: 'New Post', _createdAt: '', _updatedAt: '' }
    mockFetch.mockResolvedValue(makeResponse(201, newDoc))
    await apiCreateDraft('New Post', 'new-post')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ title: 'New Post', slug: 'new-post' })
  })

  it('returns the created document', async () => {
    const newDoc = { _id: 'drafts.uuid', _type: 'article', title: 'New Post', _createdAt: '', _updatedAt: '' }
    mockFetch.mockResolvedValue(makeResponse(201, newDoc))

    const result = await apiCreateDraft('New Post', 'new-post')
    expect(result).toEqual(newDoc)
  })

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(makeResponse(400, { error: '"slug" is required' }))
    await expect(apiCreateDraft('Post', '')).rejects.toThrow('"slug" is required')
  })
})

// ── apiGetDocument ─────────────────────────────────────────────────────────────

describe('apiGetDocument', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends a GET request to the document endpoint', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { _id: 'drafts.doc-123' }))
    await apiGetDocument('drafts.doc-123')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sanity/documents/drafts.doc-123',
      expect.objectContaining({ redirect: 'manual' }),
    )
  })

  it('encodes special characters in the document ID', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { _id: 'drafts.some/id' }))
    await apiGetDocument('drafts.some/id')

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit]
    expect(url).toContain(encodeURIComponent('drafts.some/id'))
  })

  it('returns null when API returns null', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, null))
    const result = await apiGetDocument('missing-id')
    expect(result).toBeNull()
  })
})

// ── apiCheckGrammar ─────────────────────────────────────────────────────────────

describe('apiCheckGrammar', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('sends a POST request to the grammar endpoint', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { language: 'en', matches: [] }))
    await apiCheckGrammar('This are bad grammar.', 'en')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/grammar/check',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends text and language in the request body', async () => {
    mockFetch.mockResolvedValue(makeResponse(200, { language: 'en', matches: [] }))
    await apiCheckGrammar('This are bad grammar.', 'en-GB')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ text: 'This are bad grammar.', language: 'en-GB' })
  })

  it('returns grammar matches from the API', async () => {
    const payload = {
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
    }
    mockFetch.mockResolvedValue(makeResponse(200, payload))
    await expect(apiCheckGrammar('This are bad grammar.', 'en')).resolves.toEqual(payload)
  })

  it('throws on non-2xx responses', async () => {
    mockFetch.mockResolvedValue(makeResponse(502, { error: 'Grammar service unavailable' }))
    await expect(apiCheckGrammar('Hello world', 'en')).rejects.toThrow('Grammar service unavailable')
  })
})
