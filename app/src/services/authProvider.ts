import { runtimeConfig, type FrontendRuntimeConfig } from '../config/runtime'

export interface AuthUser {
  identityProvider: string
  userId: string
  userDetails: string
  userRoles: string[]
}

export interface AuthProvider {
  getCurrentUser(): Promise<AuthUser | null>
  getLoginUrl(postLoginRedirectPath: string): string
  getLogoutUrl(): string
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseAuthUser(value: unknown): AuthUser | null {
  if (!isRecord(value)) return null
  if (
    typeof value['identityProvider'] !== 'string'
    || typeof value['userId'] !== 'string'
    || typeof value['userDetails'] !== 'string'
    || !isStringArray(value['userRoles'])
  ) {
    return null
  }

  return {
    identityProvider: value['identityProvider'],
    userId: value['userId'],
    userDetails: value['userDetails'],
    userRoles: value['userRoles'],
  }
}

function readCurrentUser(payload: unknown, provider: FrontendRuntimeConfig['auth']['provider']): AuthUser | null {
  if (provider === 'api') return parseAuthUser(payload)
  if (!isRecord(payload)) return null
  return parseAuthUser(payload['clientPrincipal'])
}

function normalizeRedirectPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export function createRuntimeAuthProvider(config: FrontendRuntimeConfig = runtimeConfig): AuthProvider {
  return {
    async getCurrentUser(): Promise<AuthUser | null> {
      try {
        const res = await fetch(config.auth.currentUserPath)
        if (!res.ok) return null
        return readCurrentUser(await res.json(), config.auth.provider)
      } catch {
        return null
      }
    },
    getLoginUrl(postLoginRedirectPath: string): string {
      const redirectPath = normalizeRedirectPath(postLoginRedirectPath)
      return `${config.auth.loginPath}?${config.auth.postLoginRedirectParam}=${encodeURIComponent(redirectPath)}`
    },
    getLogoutUrl(): string {
      return config.auth.logoutPath
    },
  }
}

export const authProvider: AuthProvider = createRuntimeAuthProvider()
