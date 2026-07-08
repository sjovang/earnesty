import { describe, it, expect } from 'vitest'
import { createRuntimeConfig } from '../runtime.js'

function makeEnv(overrides: Record<string, string | undefined> = {}): ImportMetaEnv {
  return {
    BASE_URL: '/',
    DEV: false,
    PROD: true,
    MODE: 'production',
    SSR: false,
    VITE_SANITY_PROJECT_ID: 'test-project',
    ...overrides,
  }
}

describe('createRuntimeConfig', () => {
  it('applies defaults for optional values', () => {
    const config = createRuntimeConfig(makeEnv())

    expect(config.content.documentType).toBe('blog')
    expect(config.content.draftPrefix).toBe('drafts.')
    expect(config.auth.loginPath).toBe('/.auth/login/aad')
    expect(config.app.name).toBe('Earnesty')
  })

  it('throws when VITE_SANITY_PROJECT_ID is missing outside test mode', () => {
    expect(() => createRuntimeConfig(makeEnv({ VITE_SANITY_PROJECT_ID: undefined }))).toThrow(
      'VITE_SANITY_PROJECT_ID is required',
    )
  })

  it('allows missing VITE_SANITY_PROJECT_ID in test mode', () => {
    const config = createRuntimeConfig(makeEnv({ MODE: 'test', VITE_SANITY_PROJECT_ID: undefined }))
    expect(config.sanity.projectId).toBe('unset')
  })

  it('throws when the draft prefix does not end with a dot', () => {
    expect(() => createRuntimeConfig(makeEnv({ VITE_SANITY_DRAFT_PREFIX: 'drafts' }))).toThrow(
      'VITE_SANITY_DRAFT_PREFIX must end with "."',
    )
  })

  it('uses custom schema mapping when provided', () => {
    const config = createRuntimeConfig(
      makeEnv({
        VITE_SANITY_DOCUMENT_TYPE: 'article',
        VITE_SANITY_TITLE_FIELD: 'headline',
        VITE_SANITY_BODY_FIELD: 'content',
        VITE_SANITY_SLUG_FIELD: 'path',
        VITE_SANITY_PUBLISHED_AT_FIELD: 'publishedOn',
      }),
    )

    expect(config.content).toMatchObject({
      documentType: 'article',
      titleField: 'headline',
      bodyField: 'content',
      slugField: 'path',
      publishedAtField: 'publishedOn',
    })
  })
})
