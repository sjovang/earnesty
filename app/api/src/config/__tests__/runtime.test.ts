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
    expect(config.auth).toEqual({
      provider: 'swa',
      principalHeader: 'x-ms-client-principal',
      principalEncoding: 'base64-json',
    })
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

  it('switches auth defaults for generic header provider', () => {
    process.env['SANITY_PROJECT_ID'] = 'project'
    process.env['SANITY_TOKEN'] = 'token'
    process.env['AUTH_PROVIDER'] = 'header'

    const config = getApiRuntimeConfig()
    expect(config.auth).toEqual({
      provider: 'header',
      principalHeader: 'x-authenticated-principal',
      principalEncoding: 'json',
    })
  })

  it('throws on invalid auth provider', () => {
    process.env['SANITY_PROJECT_ID'] = 'project'
    process.env['SANITY_TOKEN'] = 'token'
    process.env['AUTH_PROVIDER'] = 'custom'

    expect(() => getApiRuntimeConfig()).toThrow('AUTH_PROVIDER must be "swa" or "header"')
  })

  it('throws on invalid principal header name', () => {
    process.env['SANITY_PROJECT_ID'] = 'project'
    process.env['SANITY_TOKEN'] = 'token'
    process.env['AUTH_PRINCIPAL_HEADER'] = 'x principal'

    expect(() => getApiRuntimeConfig()).toThrow('AUTH_PRINCIPAL_HEADER must contain only letters, digits, and hyphens')
  })
})
