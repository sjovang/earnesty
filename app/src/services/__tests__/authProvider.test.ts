import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRuntimeAuthProvider } from '../authProvider.js'
import type { FrontendRuntimeConfig } from '../../config/runtime.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function makeConfig(
  overrides: Partial<FrontendRuntimeConfig['auth']> = {},
): FrontendRuntimeConfig {
  return {
    app: {
      name: 'Earnesty',
      introTitle: 'title',
      introLead: 'lead',
      introHint: 'hint',
      aboutSummary: 'summary',
    },
    auth: {
      provider: 'swa',
      currentUserPath: '/.auth/me',
      loginPath: '/.auth/login/aad',
      logoutPath: '/.auth/logout',
      postLoginRedirectParam: 'post_login_redirect_uri',
      ...overrides,
    },
    content: {
      defaultType: 'blog',
      typeOrder: ['blog'],
      types: {
        blog: {
          name: 'blog',
          label: 'Blog',
          titleField: 'title',
          bodyField: 'body',
          slugField: 'slug',
          publishedAtField: 'publishedAt',
          metadataFields: [
            { key: 'title', label: 'Title', field: 'title', type: 'string', required: true },
            { key: 'slug', label: 'Slug', field: 'slug', type: 'slug', required: true },
          ],
        },
      },
      documentType: 'blog',
      draftPrefix: 'drafts.',
      titleField: 'title',
      bodyField: 'body',
      slugField: 'slug',
      publishedAtField: 'publishedAt',
    },
    sanity: {
      projectId: 'project',
      dataset: 'dataset',
      apiVersion: '2024-01-01',
      useProxy: false,
    },
    telemetry: {},
  }
}

function makeResponse(body: unknown, ok = true): Response {
  return {
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response
}

describe('createRuntimeAuthProvider', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  it('reads SWA current-user envelopes by default', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      clientPrincipal: {
        identityProvider: 'aad',
        userId: 'user-1',
        userDetails: 'user@example.com',
        userRoles: ['authenticated'],
      },
    }))

    const provider = createRuntimeAuthProvider(makeConfig())
    await expect(provider.getCurrentUser()).resolves.toEqual({
      identityProvider: 'aad',
      userId: 'user-1',
      userDetails: 'user@example.com',
      userRoles: ['authenticated'],
    })
    expect(mockFetch).toHaveBeenCalledWith('/.auth/me')
  })

  it('reads direct API principals when configured', async () => {
    mockFetch.mockResolvedValue(makeResponse({
      identityProvider: 'proxy',
      userId: 'user-2',
      userDetails: 'proxy@example.com',
      userRoles: ['authenticated'],
    }))

    const provider = createRuntimeAuthProvider(makeConfig({
      provider: 'api',
      currentUserPath: '/api/me',
    }))
    await expect(provider.getCurrentUser()).resolves.toEqual({
      identityProvider: 'proxy',
      userId: 'user-2',
      userDetails: 'proxy@example.com',
      userRoles: ['authenticated'],
    })
    expect(mockFetch).toHaveBeenCalledWith('/api/me')
  })

  it('returns null for malformed current-user payloads', async () => {
    mockFetch.mockResolvedValue(makeResponse({ clientPrincipal: { userId: 'missing-fields' } }))

    const provider = createRuntimeAuthProvider(makeConfig())
    await expect(provider.getCurrentUser()).resolves.toBeNull()
  })

  it('builds login URLs from the configured runtime contract', () => {
    const provider = createRuntimeAuthProvider(makeConfig({
      loginPath: '/auth/login',
      postLoginRedirectParam: 'redirectTo',
    }))

    expect(provider.getLoginUrl('/editor?doc=1')).toBe('/auth/login?redirectTo=%2Feditor%3Fdoc%3D1')
  })
})
