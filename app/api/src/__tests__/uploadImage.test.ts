import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

// vi.hoisted() ensures these helpers exist when the vi.mock() factory runs.
const { getUploadHandler, setUploadHandler } = vi.hoisted(() => {
  let _handler: ((req: HttpRequest) => Promise<HttpResponseInit>) | null = null
  return {
    getUploadHandler: () => _handler!,
    setUploadHandler: (h: (req: HttpRequest) => Promise<HttpResponseInit>) => {
      _handler = h
    },
  }
})

vi.mock('@azure/functions', () => ({
  app: {
    http: (_name: string, config: { handler: (req: HttpRequest) => Promise<HttpResponseInit> }) => {
      setUploadHandler(config.handler)
    },
  },
}))

vi.mock('../shared.js', () => ({
  getSanityClient: vi.fn(),
  parseClientPrincipal: vi.fn(),
}))

// Mock busboy to avoid dealing with real multipart parsing in unit tests
vi.mock('busboy', () => {
  const { EventEmitter } = require('events')
  return {
    default: vi.fn(() => {
      const bb = new EventEmitter()
      bb.write = vi.fn()
      bb.end = vi.fn(() => {
        // Simulated in each test via mockBusboyBehaviour
      })
      return bb
    }),
  }
})

beforeAll(async () => {
  await import('../functions/uploadImage.js')
})

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_PRINCIPAL = {
  identityProvider: 'aad',
  userId: 'user-123',
  userDetails: 'test@example.com',
  userRoles: ['authenticated'],
  claims: [],
}

function makeRequest(options: {
  contentType?: string
  arrayBuffer?: ArrayBuffer
  principalHeader?: string | null
}): HttpRequest {
  return {
    headers: {
      get: (name: string) => {
        if (name === 'x-ms-client-principal') {
          return options.principalHeader !== undefined ? options.principalHeader : 'principal-header'
        }
        if (name === 'content-type') {
          return options.contentType ?? 'multipart/form-data; boundary=----boundary'
        }
        return null
      },
    },
    params: {},
    arrayBuffer: vi.fn().mockResolvedValue(options.arrayBuffer ?? new ArrayBuffer(0)),
  } as unknown as HttpRequest
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('uploadImage handler', () => {
  beforeEach(() => {
    vi.mocked(parseClientPrincipal).mockReturnValue(VALID_PRINCIPAL)
  })

  it('returns 401 when not authenticated', async () => {
    vi.mocked(parseClientPrincipal).mockReturnValue(null)
    const res = await getUploadHandler()(makeRequest({}))
    expect(res.status).toBe(401)
    expect(res.jsonBody).toEqual({ error: 'Not authenticated' })
  })

  it('returns 400 when content-type is not multipart/form-data', async () => {
    const res = await getUploadHandler()(makeRequest({ contentType: 'application/json' }))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Content-Type must be multipart/form-data' })
  })

  it('returns 400 when no file is present in the multipart body', async () => {
    const busboy = await import('busboy')
    const { EventEmitter } = await import('events')
    const bb = new EventEmitter() as any
    bb.write = vi.fn()
    bb.end = vi.fn(() => {
      // Emit close without any file event → "No file found"
      setImmediate(() => bb.emit('close'))
    })
    vi.mocked(busboy.default).mockReturnValueOnce(bb)

    const res = await getUploadHandler()(makeRequest({}))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'No file found in request' })
  })

  it('returns 400 when uploaded file is not an image', async () => {
    const busboy = await import('busboy')
    const { EventEmitter } = await import('events')
    const bb = new EventEmitter() as any
    bb.write = vi.fn()
    bb.end = vi.fn(() => {
      setImmediate(() => {
        const fileStream = new EventEmitter() as any
        fileStream.resume = vi.fn()
        bb.emit('file', 'file', fileStream, { filename: 'data.pdf', mimeType: 'application/pdf' })
        setImmediate(() => fileStream.emit('close'))
      })
    })
    vi.mocked(busboy.default).mockReturnValueOnce(bb)

    const res = await getUploadHandler()(makeRequest({}))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'Only image files are accepted' })
  })

  it('returns 400 when file exceeds size limit', async () => {
    const busboy = await import('busboy')
    const { EventEmitter } = await import('events')
    const bb = new EventEmitter() as any
    bb.write = vi.fn()
    bb.end = vi.fn(() => {
      setImmediate(() => {
        const fileStream = new EventEmitter() as any
        fileStream.resume = vi.fn()
        bb.emit('file', 'file', fileStream, { filename: 'big.jpg', mimeType: 'image/jpeg' })
        setImmediate(() => {
          fileStream.emit('limit')
          fileStream.emit('close')
        })
      })
    })
    vi.mocked(busboy.default).mockReturnValueOnce(bb)

    const res = await getUploadHandler()(makeRequest({}))
    expect(res.status).toBe(400)
    expect(res.jsonBody).toEqual({ error: 'File exceeds the 16 MB limit' })
  })

  it('uploads image and returns 200 with asset data', async () => {
    const busboy = await import('busboy')
    const { EventEmitter } = await import('events')
    const bb = new EventEmitter() as any
    bb.write = vi.fn()
    bb.end = vi.fn(() => {
      setImmediate(() => {
        const fileStream = new EventEmitter() as any
        fileStream.resume = vi.fn()
        bb.emit('file', 'file', fileStream, { filename: 'photo.jpg', mimeType: 'image/jpeg' })
        setImmediate(() => {
          fileStream.emit('data', Buffer.from('fake-image-data'))
          fileStream.emit('close')
        })
      })
    })
    vi.mocked(busboy.default).mockReturnValueOnce(bb)

    const mockAsset = {
      _id: 'image-abc123-800x600-jpg',
      url: 'https://cdn.sanity.io/images/proj/dataset/abc123-800x600.jpg',
      metadata: { dimensions: { width: 800, height: 600 } },
    }
    const mockUpload = vi.fn().mockResolvedValue(mockAsset)
    vi.mocked(getSanityClient).mockReturnValue({
      assets: { upload: mockUpload },
    } as any)

    const res = await getUploadHandler()(makeRequest({}))
    expect(res.status).toBe(200)
    expect(res.jsonBody).toEqual({
      assetRef: 'image-abc123-800x600-jpg',
      url: mockAsset.url,
      width: 800,
      height: 600,
    })
    expect(mockUpload).toHaveBeenCalledWith(
      'image',
      expect.any(Buffer),
      { filename: 'photo.jpg', contentType: 'image/jpeg' },
    )
  })

  it('returns 502 when Sanity upload throws', async () => {
    const busboy = await import('busboy')
    const { EventEmitter } = await import('events')
    const bb = new EventEmitter() as any
    bb.write = vi.fn()
    bb.end = vi.fn(() => {
      setImmediate(() => {
        const fileStream = new EventEmitter() as any
        fileStream.resume = vi.fn()
        bb.emit('file', 'file', fileStream, { filename: 'photo.jpg', mimeType: 'image/jpeg' })
        setImmediate(() => fileStream.emit('close'))
      })
    })
    vi.mocked(busboy.default).mockReturnValueOnce(bb)

    vi.mocked(getSanityClient).mockReturnValue({
      assets: { upload: vi.fn().mockRejectedValue(new Error('Upload failed')) },
    } as any)

    const res = await getUploadHandler()(makeRequest({}))
    expect(res.status).toBe(502)
    expect(res.jsonBody).toEqual({ error: 'Upload failed' })
  })
})
