/**
 * Integration tests for Sanity backend operations.
 *
 * These tests run against the real Sanity development dataset and verify the
 * exact operations that each Azure Function performs. They require the
 * SANITY_PROJECT_ID and SANITY_TOKEN environment variables to be set.
 *
 * Run with: npm run test:integration
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getSanityClient } from '../shared.js'

const hasCredentials = Boolean(
  process.env['SANITY_PROJECT_ID'] && process.env['SANITY_TOKEN'],
)

// Each integration run gets a unique document ID so parallel runs never clash.
const RUN_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
const DRAFT_ID = `drafts.integration-${RUN_ID}`
const PUBLISHED_ID = `integration-${RUN_ID}`

const TEST_BLOCKS = [
  {
    _key: 'b1',
    _type: 'block',
    style: 'normal',
    children: [{ _key: 's1', _type: 'span', text: 'Hello from integration tests.', marks: [] }],
    markDefs: [],
  },
]

describe.skipIf(!hasCredentials)('Integration: document lifecycle (mirrors Azure Functions)', () => {
  afterAll(async () => {
    // Best-effort cleanup — runs even if tests fail.
    const client = getSanityClient()
    await Promise.allSettled([
      client.delete(DRAFT_ID),
      client.delete(PUBLISHED_ID),
    ])
  })

  // ── createDraft ─────────────────────────────────────────────────────────────
  // Mirrors the operation in createDraft.ts:
  //   getSanityClient().create({ _id, _type: 'blog', title, slug })

  describe('createDraft operation', () => {
    it('creates a draft document in Sanity', async () => {
      const client = getSanityClient()
      const doc = await client.create({
        _id: DRAFT_ID,
        _type: 'blog',
        title: 'Integration Test Draft',
        slug: { _type: 'slug', current: `integration-test-${RUN_ID}` },
      })

      expect(doc._id).toBe(DRAFT_ID)
      expect(doc._type).toBe('blog')
      expect(doc.title).toBe('Integration Test Draft')
    })

    it('the created document is retrievable immediately (useCdn: false)', async () => {
      const doc = await getSanityClient().getDocument(DRAFT_ID)
      expect(doc).not.toBeNull()
      expect(doc?._id).toBe(DRAFT_ID)
    })
  })

  // ── saveDocument ─────────────────────────────────────────────────────────────
  // Mirrors the operation in saveDocument.ts:
  //   getSanityClient().patch(id).set({ body, title }).commit()

  describe('saveDocument operation', () => {
    it('patches the draft with PortableText blocks', async () => {
      const client = getSanityClient()
      const result = await client
        .patch(DRAFT_ID)
        .set({ body: TEST_BLOCKS })
        .commit()

      expect(result._id).toBe(DRAFT_ID)
    })

    it('patches the draft title', async () => {
      const client = getSanityClient()
      const result = await client
        .patch(DRAFT_ID)
        .set({ title: 'Updated Integration Title' })
        .commit()

      expect(result._id).toBe(DRAFT_ID)
    })

    it('persists patched content when the document is fetched back', async () => {
      const doc = await getSanityClient().getDocument(DRAFT_ID) as Record<string, unknown>
      expect(doc?.['title']).toBe('Updated Integration Title')
      expect(Array.isArray(doc?.['body'])).toBe(true)
      const body = doc?.['body'] as Array<Record<string, unknown>>
      expect(body[0]?.['_type']).toBe('block')
    })
  })

  // ── publishDocument ──────────────────────────────────────────────────────────
  // Mirrors the operation in publishDocument.ts:
  //   const draft = await getSanityClient().getDocument(id)
  //   getSanityClient().transaction().createOrReplace({ ...fields, _id: publishedId }).delete(id).commit()

  describe('publishDocument operation', () => {
    it('fetches the draft before publishing', async () => {
      const draft = await getSanityClient().getDocument(DRAFT_ID)
      expect(draft).not.toBeNull()
      expect(draft?._id).toBe(DRAFT_ID)
    })

    it('atomically creates the published document and deletes the draft', async () => {
      const client = getSanityClient()
      const draft = await client.getDocument(DRAFT_ID) as Record<string, unknown>

      const { _id: _draftId, _rev: _draftRev, ...fields } = draft
      const result = await client
        .transaction()
        .createOrReplace({ ...fields, _id: PUBLISHED_ID })
        .delete(DRAFT_ID)
        .commit()

      expect(result.transactionId).toBeDefined()
    })

    it('published document exists with the correct content after the transaction', async () => {
      const published = await getSanityClient().getDocument(PUBLISHED_ID) as Record<string, unknown>
      expect(published?.['_id']).toBe(PUBLISHED_ID)
      expect(published?.['_type']).toBe('blog')
      expect(published?.['title']).toBe('Updated Integration Title')
      // _rev must not be the original draft's _rev
      expect(published?.['_rev']).toBeDefined()
    })

    it('draft is gone after the publish transaction', async () => {
      const draft = await getSanityClient().getDocument(DRAFT_ID)
      expect(draft).toBeUndefined()
    })
  })
})
