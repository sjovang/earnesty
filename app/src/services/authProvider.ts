import { runtimeConfig } from '../config/runtime'

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

function normalizeRedirectPath(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//')) return '/'
  return path
}

export function createSwaAuthProvider(): AuthProvider {
  return {
    async getCurrentUser(): Promise<AuthUser | null> {
      try {
        const res = await fetch('/.auth/me')
        if (!res.ok) return null
        const data = (await res.json()) as { clientPrincipal: AuthUser | null }
        return data.clientPrincipal
      } catch {
        return null
      }
    },
    getLoginUrl(postLoginRedirectPath: string): string {
      const redirectPath = normalizeRedirectPath(postLoginRedirectPath)
      return `${runtimeConfig.auth.loginPath}?${runtimeConfig.auth.postLoginRedirectParam}=${encodeURIComponent(redirectPath)}`
    },
    getLogoutUrl(): string {
      return runtimeConfig.auth.logoutPath
    },
  }
}

export const authProvider: AuthProvider = createSwaAuthProvider()
