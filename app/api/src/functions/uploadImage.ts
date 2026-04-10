import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import busboy from 'busboy'
import { fileTypeFromBuffer } from 'file-type'
import { getSanityClient, parseClientPrincipal } from '../shared.js'

const MAX_FILE_SIZE = 16 * 1024 * 1024 // 16 MB

/** Parses the first image file from a multipart/form-data request. */
function parseMultipart(
  request: HttpRequest,
): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const contentType = request.headers.get('content-type') ?? ''
    const bb = busboy({
      headers: { 'content-type': contentType },
      limits: { files: 1, fileSize: MAX_FILE_SIZE },
    })

    let resolved = false

    bb.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info
      const chunks: Buffer[] = []
      let truncated = false

      file.on('data', (chunk: Buffer) => chunks.push(chunk))
      file.on('limit', () => {
        truncated = true
        file.resume()
      })
      file.on('close', () => {
        if (truncated) {
          reject(new Error(`File exceeds the ${MAX_FILE_SIZE / 1024 / 1024} MB limit`))
          return
        }
        if (!resolved) {
          resolved = true
          resolve({ buffer: Buffer.concat(chunks), filename, mimeType })
        }
      })
    })

    bb.on('error', reject)
    bb.on('close', () => {
      if (!resolved) reject(new Error('No file found in request'))
    })

    // Feed the raw request body into busboy
    request.arrayBuffer().then((ab) => {
      bb.write(Buffer.from(ab))
      bb.end()
    }).catch(reject)
  })
}

app.http('uploadImage', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'sanity/images',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const principal = parseClientPrincipal(
      request.headers.get('x-ms-client-principal'),
    )
    if (!principal) {
      return { status: 401, jsonBody: { error: 'Not authenticated' } }
    }

    const contentType = request.headers.get('content-type') ?? ''
    if (!contentType.includes('multipart/form-data')) {
      return {
        status: 400,
        jsonBody: { error: 'Content-Type must be multipart/form-data' },
      }
    }

    let file: { buffer: Buffer; filename: string; mimeType: string }
    try {
      file = await parseMultipart(request)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse upload'
      return { status: 400, jsonBody: { error: message } }
    }

    if (!file.mimeType.startsWith('image/')) {
      return { status: 400, jsonBody: { error: 'Only image files are accepted' } }
    }

    // Verify the file's actual content using magic-byte inspection, independent
    // of the client-supplied Content-Type header.
    const detected = await fileTypeFromBuffer(file.buffer)
    if (!detected || !detected.mime.startsWith('image/')) {
      return { status: 400, jsonBody: { error: 'Only image files are accepted' } }
    }

    try {
      const asset = await getSanityClient().assets.upload(
        'image',
        file.buffer,
        { filename: file.filename, contentType: file.mimeType },
      )
      return {
        status: 200,
        jsonBody: {
          assetRef: asset._id,
          url: asset.url,
          width: asset.metadata?.dimensions?.width ?? null,
          height: asset.metadata?.dimensions?.height ?? null,
        },
      }
    } catch (err) {
      console.error('[uploadImage]', err)
      return { status: 502, jsonBody: { error: 'Failed to upload image' } }
    }
  },
})
