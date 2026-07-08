/**
 * Tests that fetchDocuments and fetchDocument use the configured schema
 * mapping (documentType, titleField, bodyField, publishedAtField) in GROQ
 * queries instead of the built-in defaults.
 *
 * The config module is mocked at the top level so the module-level
 * `contentConfig` constant in sanity.ts picks up the custom values on import.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchDocuments, fetchDocument } from '../sanity.js'

const { mockClientFetch, CUSTOM_CONTENT_CONFIG } = vi.hoisted(() => ({
  mockClientFetch: vi.fn(),
  CUSTOM_CONTENT_CONFIG: {
    documentType: 'article',
    titleField: 'headline',
    bodyField: 'content',
    slugField: 'path',
    publishedAtField: 'publishedOn',
    draftPrefix: 'drafts.',
  },
}))

vi.mock('@sanity/client', () => ({
  createClient: vi.fn(() => ({ fetch: mockClientFetch })),
}))

vi.mock('../../config/runtime.js', () => ({
  runtimeConfig: {
    content: CUSTOM_CONTENT_CONFIG,
    sanity: {
      projectId: 'custom-project',
      dataset: 'production',
      apiVersion: '2024-01-01',
      useProxy: false,
    },
    app: { name: 'Test' },
    auth: { loginPath: '/.auth/login/aad', logoutPath: '/.auth/logout', postLoginRedirectParam: 'post_login_redirect_uri' },
    telemetry: {},
  },
  isDraftDocumentId: vi.fn((id: string) => id.startsWith('drafts.')),
  toPublishedDocumentId: vi.fn((id: string) => id.replace(/^drafts\./, '')),
  draftDocumentIdPattern: vi.fn(() => /^drafts\..+$/),
}))

// ── fetchDocuments with custom mapping ────────────────────────────────────────

describe('fetchDocuments – custom schema mapping', () => {
  beforeEach(() => {
    mockClientFetch.mockReset()
  })

  it('uses the configured document type in the GROQ filter', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('_type == "article"')
    expect(query).not.toContain('_type == "blog"')
  })

  it('aliases the configured title field to "title" in the projection', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('"title": headline')
  })

  it('aliases the configured body field to "body" in the projection', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('"body": content')
  })

  it('aliases the configured publishedAt field to "publishedAt" in the projection', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('"publishedAt": publishedOn')
  })

  it('orders by the configured publishedAt field', async () => {
    mockClientFetch.mockResolvedValue([])
    await fetchDocuments()

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('publishedOn')
    expect(query).toContain('order(')
  })
})

// ── fetchDocument with custom mapping ────────────────────────────────────────

describe('fetchDocument – custom schema mapping', () => {
  beforeEach(() => {
    mockClientFetch.mockReset()
  })

  it('uses the configured document type in the GROQ filter', async () => {
    mockClientFetch.mockResolvedValue(null)
    await fetchDocument('doc-1')

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('_type == "article"')
    expect(query).not.toContain('_type == "blog"')
  })

  it('aliases the configured title field to "title" in the projection', async () => {
    mockClientFetch.mockResolvedValue(null)
    await fetchDocument('doc-1')

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('"title": headline')
  })

  it('aliases the configured body field to "body" in the projection', async () => {
    mockClientFetch.mockResolvedValue(null)
    await fetchDocument('doc-1')

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('"body": content')
  })

  it('aliases the configured publishedAt field to "publishedAt" in the projection', async () => {
    mockClientFetch.mockResolvedValue(null)
    await fetchDocument('doc-1')

    const query = mockClientFetch.mock.calls[0][0] as string
    expect(query).toContain('"publishedAt": publishedOn')
  })
})
