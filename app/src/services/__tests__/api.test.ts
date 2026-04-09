import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiSaveDocument, apiPublishDocument, apiCreateDraft } from '../api.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeResponse(status: number, body?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    type: 'basic',
    redirected: false,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Stub browser globals used by redirectToLogin() to prevent errors on 401.
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn(() => '0'),
  setItem: vi.fn(),
  removeItem: vi.fn(),
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
    const newDoc = { _id: 'drafts.uuid', _type: 'blog', title: 'New Post', _createdAt: '', _updatedAt: '' }
    mockFetch.mockResolvedValue(makeResponse(201, newDoc))
    await apiCreateDraft('New Post', 'new-post')

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/sanity/documents',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('sends title and slug in the request body', async () => {
    const newDoc = { _id: 'drafts.uuid', _type: 'blog', title: 'New Post', _createdAt: '', _updatedAt: '' }
    mockFetch.mockResolvedValue(makeResponse(201, newDoc))
    await apiCreateDraft('New Post', 'new-post')

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body).toEqual({ title: 'New Post', slug: 'new-post' })
  })

  it('returns the created document', async () => {
    const newDoc = { _id: 'drafts.uuid', _type: 'blog', title: 'New Post', _createdAt: '', _updatedAt: '' }
    mockFetch.mockResolvedValue(makeResponse(201, newDoc))

    const result = await apiCreateDraft('New Post', 'new-post')
    expect(result).toEqual(newDoc)
  })

  it('throws on a non-2xx response', async () => {
    mockFetch.mockResolvedValue(makeResponse(400, { error: '"slug" is required' }))
    await expect(apiCreateDraft('Post', '')).rejects.toThrow('"slug" is required')
  })
})
