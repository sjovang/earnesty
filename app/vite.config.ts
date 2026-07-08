import { fileURLToPath, URL } from 'node:url'

import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'

interface SchemaTypeInput {
  name: unknown
  titleField?: unknown
  bodyField?: unknown
  slugField?: unknown
  publishedAtField?: unknown
}

interface SchemaConfigInput {
  defaultType?: unknown
  types?: unknown
}

interface ContentTypeConfig {
  name: string
  titleField: string
  bodyField: string
  slugField: string
  publishedAtField: string
}

const BUILTIN_CONTENT_TYPE: ContentTypeConfig = {
  name: 'blog',
  titleField: 'title',
  bodyField: 'body',
  slugField: 'slug',
  publishedAtField: 'publishedAt',
}

function envString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readFieldName(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Invalid runtime configuration: ${key} is required`)
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(value)) {
    throw new Error(`Invalid runtime configuration: ${key} must match /^[A-Za-z_][A-Za-z0-9_]*$/`)
  }
  return value
}

function readSchemaType(input: SchemaTypeInput, index: number): ContentTypeConfig {
  return {
    name: readFieldName(envString(input.name), `VITE_SANITY_SCHEMA_CONFIG.types[${index}].name`),
    titleField: readFieldName(
      envString(input.titleField),
      `VITE_SANITY_SCHEMA_CONFIG.types[${index}].titleField`,
    ),
    bodyField: readFieldName(
      envString(input.bodyField),
      `VITE_SANITY_SCHEMA_CONFIG.types[${index}].bodyField`,
    ),
    slugField: readFieldName(
      envString(input.slugField),
      `VITE_SANITY_SCHEMA_CONFIG.types[${index}].slugField`,
    ),
    publishedAtField: readFieldName(
      envString(input.publishedAtField),
      `VITE_SANITY_SCHEMA_CONFIG.types[${index}].publishedAtField`,
    ),
  }
}

function readSchemaConfig(value: string | undefined): { defaultType: string; types: Record<string, ContentTypeConfig> } {
  if (!value) {
    return {
      defaultType: BUILTIN_CONTENT_TYPE.name,
      types: { [BUILTIN_CONTENT_TYPE.name]: BUILTIN_CONTENT_TYPE },
    }
  }

  let parsed: SchemaConfigInput
  try {
    parsed = JSON.parse(value) as SchemaConfigInput
  } catch (error) {
    throw new Error('Invalid runtime configuration: VITE_SANITY_SCHEMA_CONFIG must be valid JSON', {
      cause: error,
    })
  }

  if (!Array.isArray(parsed.types) || parsed.types.length === 0) {
    throw new Error('Invalid runtime configuration: VITE_SANITY_SCHEMA_CONFIG.types must be a non-empty array')
  }

  const types: Record<string, ContentTypeConfig> = {}
  const typeOrder: string[] = []
  for (const [index, raw] of parsed.types.entries()) {
    const config = readSchemaType((raw ?? {}) as SchemaTypeInput, index)
    if (types[config.name]) {
      throw new Error(
        `Invalid runtime configuration: duplicate type "${config.name}" in VITE_SANITY_SCHEMA_CONFIG.types`,
      )
    }
    types[config.name] = config
    typeOrder.push(config.name)
  }

  const defaultType = envString(parsed.defaultType)
    ? readFieldName(envString(parsed.defaultType), 'VITE_SANITY_SCHEMA_CONFIG.defaultType')
    : (typeOrder[0] ?? BUILTIN_CONTENT_TYPE.name)
  if (!types[defaultType]) {
    throw new Error(
      `Invalid runtime configuration: defaultType "${defaultType}" is not defined in VITE_SANITY_SCHEMA_CONFIG.types`,
    )
  }

  return { defaultType, types }
}

const SANITY_PROJECT_ID = process.env['VITE_SANITY_PROJECT_ID']
const SANITY_TOKEN = process.env['SANITY_TOKEN'] ?? ''
const SANITY_DATASET = process.env['VITE_SANITY_DATASET'] ?? 'production'
const SANITY_SCHEMA = readSchemaConfig(envString(process.env['VITE_SANITY_SCHEMA_CONFIG']))
const SANITY_DEFAULT_TYPE = SANITY_SCHEMA.types[SANITY_SCHEMA.defaultType]
const SANITY_DOCUMENT_TYPE = SANITY_DEFAULT_TYPE.name
const SANITY_TITLE_FIELD = SANITY_DEFAULT_TYPE.titleField
const SANITY_BODY_FIELD = SANITY_DEFAULT_TYPE.bodyField
const SANITY_SLUG_FIELD = SANITY_DEFAULT_TYPE.slugField
const SANITY_PUBLISHED_AT_FIELD = SANITY_DEFAULT_TYPE.publishedAtField
const SANITY_DRAFT_PREFIX = process.env['VITE_SANITY_DRAFT_PREFIX'] ?? 'drafts.'
const AUTH_LOGIN_PATH = process.env['VITE_AUTH_LOGIN_PATH'] ?? '/.auth/login/aad'
const AUTH_LOGOUT_PATH = process.env['VITE_AUTH_LOGOUT_PATH'] ?? '/.auth/logout'

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
    claims: [] as { typ: string; val: string }[],
  }

  return {
    name: 'dev-auth-mock',
    configureServer(server) {
      // GET /.auth/me — return mock identity
      server.middlewares.use('/.auth/me', (_req, res) => {
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify({ clientPrincipal: mockPrincipal }))
      })

      // GET auth login endpoint — redirect to home (already "signed in")
      server.middlewares.use(AUTH_LOGIN_PATH, (_req, res) => {
        res.writeHead(302, { Location: '/' })
        res.end()
      })

      // GET auth logout endpoint — redirect to home
      server.middlewares.use(AUTH_LOGOUT_PATH, (_req, res) => {
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
              `*[_type == "sanity.imageAsset"] | order(coalesce(metadata.exif.DateTimeOriginal, _createdAt) desc) {
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
            if (!id.startsWith(SANITY_DRAFT_PREFIX)) {
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
            const publishedId = id.slice(SANITY_DRAFT_PREFIX.length)
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
            const docId = `${SANITY_DRAFT_PREFIX}${crypto.randomUUID()}`
            const doc = await client.create({
              _id: docId,
              _type: SANITY_DOCUMENT_TYPE,
              [SANITY_TITLE_FIELD]: title,
              [SANITY_SLUG_FIELD]: { _type: 'slug', current: slug },
            })
            res.writeHead(201, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(doc))
          } else if (req.method === 'PATCH' && id) {
            // Save document
            const body = await readBody(req)
            const { blocks, title } = JSON.parse(body)
            const fields: Record<string, unknown> = {}
            if (Array.isArray(blocks)) {
              fields[SANITY_BODY_FIELD] = blocks
            }
            if (typeof title === 'string') {
              fields[SANITY_TITLE_FIELD] = title
            }
            await client.patch(id).set(fields).commit()
            res.writeHead(204)
            res.end()
          } else if (req.method === 'GET' && !id) {
            // List documents (authenticated — includes drafts)
            const docs = await client.fetch(
              `*[_type == "${SANITY_DOCUMENT_TYPE}"] | order(coalesce(${SANITY_PUBLISHED_AT_FIELD}, _createdAt) desc) {
                _id,
                _createdAt,
                _updatedAt,
                "publishedAt": ${SANITY_PUBLISHED_AT_FIELD},
                "title": ${SANITY_TITLE_FIELD},
                "body": ${SANITY_BODY_FIELD}[_type == "block"][0..10]
              }`,
            )
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(docs))
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
