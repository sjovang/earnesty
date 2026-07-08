import { describe, it, expect, beforeEach } from 'vitest'
import { clearApiRuntimeConfigCache, getApiRuntimeConfig } from '../runtime.js'

describe('getApiRuntimeConfig', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env['NODE_ENV'] = 'test'
    clearApiRuntimeConfigCache()
  })

  it('throws when required vars are missing', () => {
    process.env['NODE_ENV'] = 'production'
    delete process.env['SANITY_PROJECT_ID']
    delete process.env['SANITY_TOKEN']

    expect(() => getApiRuntimeConfig()).toThrow('Missing required environment variable(s)')
  })

  it('uses defaults for optional values', () => {
    process.env['SANITY_PROJECT_ID'] = 'project'
    process.env['SANITY_TOKEN'] = 'token'

    const config = getApiRuntimeConfig()
    expect(config.sanity.dataset).toBe('production')
    expect(config.content.documentType).toBe('blog')
    expect(config.content.draftPrefix).toBe('drafts.')
  })

  it('throws when SANITY_DRAFT_PREFIX does not end with a dot', () => {
    process.env['SANITY_PROJECT_ID'] = 'project'
    process.env['SANITY_TOKEN'] = 'token'
    process.env['SANITY_DRAFT_PREFIX'] = 'drafts'

    expect(() => getApiRuntimeConfig()).toThrow('SANITY_DRAFT_PREFIX must end with "."')
  })

  it('accepts schema overrides', () => {
    process.env['SANITY_PROJECT_ID'] = 'project'
    process.env['SANITY_TOKEN'] = 'token'
    process.env['SANITY_DOCUMENT_TYPE'] = 'article'
    process.env['SANITY_TITLE_FIELD'] = 'headline'

    const config = getApiRuntimeConfig()
    expect(config.content.documentType).toBe('article')
    expect(config.content.titleField).toBe('headline')
  })
})
