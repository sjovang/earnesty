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
    expect(config.auth.provider).toBe('swa')
    expect(config.auth.currentUserPath).toBe('/.auth/me')
    expect(config.auth.loginPath).toBe('/.auth/login/aad')
    expect(config.app.name).toBe('Earnesty')
    expect(config.app.storageNamespace).toBe('earnesty')
    expect(config.appearance.themes.light.colorScheme).toBe('light')
    expect(config.appearance.themes.dark.colorScheme).toBe('dark')
    expect(config.appearance.fonts.sansSerif).toContain('system-ui')
    expect(config.appearance.fonts.serif).toContain('Lora')
    expect(config.appearance.fonts.comical).toContain('Comic Sans')
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
        VITE_SANITY_SCHEMA_CONFIG: JSON.stringify({
          defaultType: 'article',
          types: [
            {
              name: 'article',
              titleField: 'headline',
              bodyField: 'content',
              slugField: 'path',
              publishedAtField: 'publishedOn',
            },
          ],
        }),
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

  it('throws when a schema type omits a required field mapping', () => {
    expect(() => createRuntimeConfig(makeEnv({
      VITE_SANITY_SCHEMA_CONFIG: JSON.stringify({
        types: [
          {
            name: 'article',
            bodyField: 'content',
            slugField: 'path',
            publishedAtField: 'publishedOn',
          },
        ],
      }),
    }))).toThrow('VITE_SANITY_SCHEMA_CONFIG.types[0].titleField is required')
  })

  it('switches the default current-user path for api auth provider', () => {
    const config = createRuntimeConfig(makeEnv({ VITE_AUTH_PROVIDER: 'api' }))
    expect(config.auth.currentUserPath).toBe('/api/me')
  })

  it('throws on invalid auth provider', () => {
    expect(() => createRuntimeConfig(makeEnv({ VITE_AUTH_PROVIDER: 'custom' }))).toThrow(
      'VITE_AUTH_PROVIDER must be "swa" or "api"',
    )
  })

  it('derives storageNamespace from app name when unset', () => {
    const config = createRuntimeConfig(makeEnv({ VITE_APP_NAME: 'My App' }))
    expect(config.app.storageNamespace).toBe('my-app')
  })

  it('accepts a custom VITE_APP_STORAGE_NAMESPACE', () => {
    const config = createRuntimeConfig(makeEnv({ VITE_APP_STORAGE_NAMESPACE: 'my-custom-ns' }))
    expect(config.app.storageNamespace).toBe('my-custom-ns')
  })

  it('throws on an invalid VITE_APP_STORAGE_NAMESPACE', () => {
    expect(() => createRuntimeConfig(makeEnv({ VITE_APP_STORAGE_NAMESPACE: 'My NS!' }))).toThrow(
      'VITE_APP_STORAGE_NAMESPACE',
    )
  })

  it('uses custom theme and font config when provided', () => {
    const config = createRuntimeConfig(makeEnv({
      VITE_THEME_CONFIG: JSON.stringify({
        light: {
          colorScheme: 'light',
          colors: {
            '--ctp-base': '#ffffff',
            '--ctp-text': '#101010',
          },
        },
        dark: {
          colorScheme: 'dark',
          colors: {
            '--ctp-base': '#101010',
            '--ctp-text': '#ffffff',
          },
        },
      }),
      VITE_FONT_CONFIG: JSON.stringify({
        sansSerif: 'Inter, system-ui, sans-serif',
        serif: 'Merriweather, serif',
        comical: '"Comic Neue", cursive',
      }),
    }))

    expect(config.appearance.themes.light.colors['--ctp-base']).toBe('#ffffff')
    expect(config.appearance.themes.dark.colors['--ctp-text']).toBe('#ffffff')
    expect(config.appearance.fonts).toEqual({
      sansSerif: 'Inter, system-ui, sans-serif',
      serif: 'Merriweather, serif',
      comical: '"Comic Neue", cursive',
    })
  })

  it('throws when custom theme config is missing required themes', () => {
    expect(() => createRuntimeConfig(makeEnv({
      VITE_THEME_CONFIG: JSON.stringify({
        light: {
          colors: {
            '--ctp-base': '#ffffff',
          },
        },
      }),
    }))).toThrow('VITE_THEME_CONFIG.dark')
  })

  it('throws when custom font config omits a required font family', () => {
    expect(() => createRuntimeConfig(makeEnv({
      VITE_FONT_CONFIG: JSON.stringify({
        sansSerif: 'Inter, sans-serif',
        serif: 'Merriweather, serif',
      }),
    }))).toThrow('VITE_FONT_CONFIG.comical')
  })
})
