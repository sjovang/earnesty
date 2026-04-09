import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

const SANITY_PROJECT_ID = process.env['VITE_SANITY_PROJECT_ID'] ?? '5ibtsfdc'
const SANITY_TOKEN = process.env['SANITY_TOKEN'] ?? ''
const SANITY_DATASET = process.env['VITE_SANITY_DATASET'] ?? 'dev'

// ── Dev auth mock ─────────────────────────────────────────────────────────────
// In development, emulate the SWA auth and API endpoints so we don't need the
// SWA CLI (which requires Azure Functions Core Tools and a compatible Node.js).
function devAuthPlugin(): Plugin {
  // Lazily import @sanity/client only when the dev server handles a request
  let sanityClient: import('@sanity/client').SanityClient | null = null
  async function getSanityClient() {
    if (sanityClient) return sanityClient
    const { createClient } = await import('@sanity/client')
    sanityClient = createClient({
      projectId: SANITY_PROJECT_ID,
      dataset: SANITY_DATASET,
      apiVersion: '2024-01-01',
      token: SANITY_TOKEN,
      useCdn: false,
    })
    return sanityClient
  }

  const mockPrincipal = {
    identityProvider: 'aad',
    userId: 'dev-user',
    userDetails: 'Local Developer',
    userRoles: ['authenticated', 'anonymous'],
  }

  return {
    name: 'dev-auth-mock',
    configureServer(server) {
      // GET /.auth/me — return mock identity
      server.middlewares.use('/.auth/me', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ clientPrincipal: mockPrincipal }))
      })

      // GET /.auth/login/aad — redirect to home (already "signed in")
      server.middlewares.use('/.auth/login/aad', (_req, res) => {
        res.writeHead(302, { Location: '/' })
        res.end()
      })

      // GET /.auth/logout — redirect to home
      server.middlewares.use('/.auth/logout', (_req, res) => {
        res.writeHead(302, { Location: '/' })
        res.end()
      })

      // GET /api/me — return mock user
      server.middlewares.use('/api/me', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(mockPrincipal))
      })

      // /api/sanity/images — upload and list image assets
      server.middlewares.use('/api/sanity/images', async (req, res) => {
        try {
          const client = await getSanityClient()

          if (req.method === 'POST') {
            // Upload image via multipart/form-data
            const busboy = (await import('busboy')).default
            const contentType = req.headers['content-type'] ?? ''
            const bb = busboy({ headers: { 'content-type': contentType }, limits: { files: 1, fileSize: 16 * 1024 * 1024 } })
            let resolved = false

            bb.on('file', (_field: string, file: import('stream').Readable & { resume(): void }, info: { filename: string; mimeType: string }) => {
              const { filename, mimeType } = info
              const chunks: Buffer[] = []
              let truncated = false
              file.on('data', (chunk: Buffer) => chunks.push(chunk))
              file.on('limit', () => { truncated = true; file.resume() })
              file.on('close', async () => {
                if (resolved) return
                if (truncated) {
                  resolved = true
                  res.writeHead(400, { 'Content-Type': 'application/json' })
                  res.end(JSON.stringify({ error: 'File exceeds the 16 MB limit' }))
                  return
                }
                resolved = true
                const buffer = Buffer.concat(chunks)
                const asset = await client.assets.upload('image', buffer, { filename, contentType: mimeType })
                res.writeHead(200, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({
                  assetRef: asset._id,
                  url: asset.url,
                  width: asset.metadata?.dimensions?.width ?? null,
                  height: asset.metadata?.dimensions?.height ?? null,
                }))
              })
            })

            bb.on('error', (err: Error) => {
              if (!resolved) {
                resolved = true
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: err.message }))
              }
            })

            bb.on('close', () => {
              if (!resolved) {
                resolved = true
                res.writeHead(400, { 'Content-Type': 'application/json' })
                res.end(JSON.stringify({ error: 'No file found in request' }))
              }
            })

            req.pipe(bb)
          } else if (req.method === 'GET') {
            const assets = await client.fetch<{ _id: string; url: string; width: number | null; height: number | null }[]>(
              `*[_type == "sanity.imageAsset"] | order(_createdAt desc) {
                _id,
                url,
                "width": metadata.dimensions.width,
                "height": metadata.dimensions.height
              }`,
            )
            const result = assets.map((a) => ({ assetRef: a._id, url: a.url, width: a.width, height: a.height }))
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(result))
          } else {
            res.writeHead(405)
            res.end()
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: message }))
        }
      })

      // /api/sanity/documents/* — proxy document operations to Sanity
      server.middlewares.use('/api/sanity/documents', async (req, res) => {
        try {
          const client = await getSanityClient()
          // Extract document ID from URL: /api/sanity/documents/{id}[/publish]
          const urlPath = req.url ?? ''
          const publishMatch = urlPath.match(/^\/([^/]+)\/publish$/)
          const id = publishMatch
            ? decodeURIComponent(publishMatch[1])
            : decodeURIComponent(urlPath.replace(/^\//, ''))

          if (publishMatch && req.method === 'POST') {
            // Publish a draft document
            if (!id.startsWith('drafts.')) {
              res.writeHead(400, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Document is not a draft' }))
              return
            }
            const draft = await client.getDocument(id)
            if (!draft) {
              res.writeHead(404, { 'Content-Type': 'application/json' })
              res.end(JSON.stringify({ error: 'Draft not found' }))
              return
            }
            const publishedId = id.slice('drafts.'.length)
            const fields = Object.fromEntries(
              Object.entries(draft).filter(([k]) => k !== '_id' && k !== '_rev'),
            )
            const tx = await client
              .transaction()
              .createOrReplace({ ...fields, _id: publishedId } as Parameters<typeof client.createOrReplace>[0])
              .delete(id)
              .commit()
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ _id: publishedId, transactionId: tx.transactionId }))
          } else if (req.method === 'POST' && !id) {
            // Create draft
            const body = await readBody(req)
            const { title, slug } = JSON.parse(body)
            const docId = `drafts.${crypto.randomUUID()}`
            const doc = await client.create({
              _id: docId,
              _type: 'blog',
              title,
              slug: { _type: 'slug', current: slug },
            })
            res.writeHead(201, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(doc))
          } else if (req.method === 'PATCH' && id) {
            // Save document
            const body = await readBody(req)
            const { blocks, title } = JSON.parse(body)
            const fields: Record<string, unknown> = {}
            if (Array.isArray(blocks)) {
              fields['body'] = blocks
            }
            if (typeof title === 'string') {
              fields['title'] = title
            }
            await client.patch(id).set(fields).commit()
            res.writeHead(204)
            res.end()
          } else {
            res.writeHead(404)
            res.end()
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Unknown error'
          res.writeHead(502, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: message }))
        }
      })
    },
  }
}

function readBody(req: import('node:http').IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk: Buffer) => { data += chunk.toString() })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    devAuthPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      // Proxy Sanity API requests through the dev server to avoid CORS issues.
      // The Sanity client is configured (in dev) to send requests to /v20xx-xx-xx/…
      // which the proxy forwards to the real Sanity API host.
      '/v2024-01-01': {
        target: `https://${SANITY_PROJECT_ID}.api.sanity.io`,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
