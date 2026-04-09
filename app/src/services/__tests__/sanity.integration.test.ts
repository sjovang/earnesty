/**
 * Integration tests for the frontend Sanity service functions.
 *
 * These tests run against the real Sanity development dataset. They use an
 * admin client (SANITY_TOKEN) to create and clean up test data, then verify
 * that fetchBlogDocuments and fetchBlogDocument can read it via the
 * unauthenticated public client in sanity.ts.
 *
 * Required environment variables:
 *   VITE_SANITY_PROJECT_ID  — Sanity project ID
 *   VITE_SANITY_DATASET     — dataset name (e.g. "development")
 *   SANITY_TOKEN            — write-access token for test setup/teardown
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@sanity/client'
import { fetchBlogDocuments, fetchBlogDocument } from '../sanity.js'

const projectId = import.meta.env.VITE_SANITY_PROJECT_ID as string | undefined
const dataset = (import.meta.env.VITE_SANITY_DATASET as string | undefined) ?? 'production'
// SANITY_TOKEN is not exposed to the frontend client intentionally;
// we read it here only for test setup and teardown.
const adminToken = process.env['SANITY_TOKEN']

const hasCredentials = Boolean(projectId && adminToken)

const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
// Use a published (non-draft) ID so the GROQ query in fetchBlogDocuments finds it.
const TEST_DOC_ID = `integration-fe-${RUN_ID}`

describe.skipIf(!hasCredentials)('Integration: Sanity fetch functions', () => {
  // Admin client used only for test fixture setup and teardown.
  const adminClient = createClient({
    projectId,
    dataset,
    apiVersion: '2024-01-01',
    token: adminToken,
    useCdn: false,
  })

  beforeAll(async () => {
    await adminClient.create({
      _id: TEST_DOC_ID,
      _type: 'blog',
      title: 'Integration Fetch Test',
      slug: { _type: 'slug', current: `integration-fe-${RUN_ID}` },
      body: [
        {
          _key: 'b1',
          _type: 'block',
          style: 'normal',
          children: [{ _key: 's1', _type: 'span', text: 'Body content.', marks: [] }],
          markDefs: [],
        },
      ],
    })
  })

  afterAll(async () => {
    await adminClient.delete(TEST_DOC_ID).catch(() => {})
  })

  // ── fetchBlogDocuments ───────────────────────────────────────────────────────

  describe('fetchBlogDocuments', () => {
    it('returns an array', async () => {
      const docs = await fetchBlogDocuments()
      expect(Array.isArray(docs)).toBe(true)
    })

    it('includes the test document in the results', async () => {
      const docs = await fetchBlogDocuments()
      const found = docs.find((d) => d._id === TEST_DOC_ID)
      expect(found).toBeDefined()
      expect(found?.title).toBe('Integration Fetch Test')
    })

    it('returns documents with the expected shape', async () => {
      const docs = await fetchBlogDocuments()
      expect(docs.length).toBeGreaterThan(0)
      const doc = docs[0]
      expect(doc).toHaveProperty('_id')
      expect(doc).toHaveProperty('_createdAt')
      expect(doc).toHaveProperty('_updatedAt')
      expect(doc).toHaveProperty('title')
    })
  })

  // ── fetchBlogDocument ────────────────────────────────────────────────────────

  describe('fetchBlogDocument', () => {
    it('retrieves the test document by ID', async () => {
      const doc = await fetchBlogDocument(TEST_DOC_ID)
      expect(doc).not.toBeNull()
      expect(doc._id).toBe(TEST_DOC_ID)
      expect(doc.title).toBe('Integration Fetch Test')
    })

    it('returns the full body of the document', async () => {
      const doc = await fetchBlogDocument(TEST_DOC_ID)
      expect(Array.isArray(doc.body)).toBe(true)
      expect(doc.body?.length).toBeGreaterThan(0)
      expect(doc.body?.[0]?._type).toBe('block')
    })
  })
})
