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

      // PATCH /api/sanity/documents/:id — proxy save to Sanity
      server.middlewares.use('/api/sanity/documents', async (req, res) => {
        try {
          const client = await getSanityClient()
          // Extract document ID from URL: /api/sanity/documents/{id}
          const urlPath = req.url ?? ''
          const id = decodeURIComponent(urlPath.replace(/^\//, ''))

          if (req.method === 'POST' && !id) {
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
            const { blocks } = JSON.parse(body)
            await client.patch(id).set({ body: blocks }).commit()
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
