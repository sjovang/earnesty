import type { HttpRequest } from '@azure/functions'
import type { AuthenticatedPrincipal } from '../types.js'
import type { ApiAuthProvider } from './swa.js'

export type PrincipalEncoding = 'base64-json' | 'json'

function isClaimsArray(value: unknown): value is NonNullable<AuthenticatedPrincipal['claims']> {
  return Array.isArray(value)
    && value.every(
      (claim) => typeof claim === 'object'
        && claim !== null
        && typeof claim['typ'] === 'string'
        && typeof claim['val'] === 'string',
    )
}

function isAuthenticatedPrincipal(value: unknown): value is AuthenticatedPrincipal {
  if (typeof value !== 'object' || value === null) return false
  const principal = value as Record<string, unknown>

  return typeof principal['identityProvider'] === 'string'
    && typeof principal['userId'] === 'string'
    && typeof principal['userDetails'] === 'string'
    && Array.isArray(principal['userRoles'])
    && principal['userRoles'].every((role) => typeof role === 'string')
    && (principal['claims'] == null || isClaimsArray(principal['claims']))
}

export function parseHeaderPrincipal(
  header: string | null,
  encoding: PrincipalEncoding,
): AuthenticatedPrincipal | null {
  if (!header) return null

  try {
    const payload = encoding === 'base64-json'
      ? Buffer.from(header, 'base64').toString('utf-8')
      : header
    const principal = JSON.parse(payload) as unknown
    return isAuthenticatedPrincipal(principal) ? principal : null
  } catch {
    return null
  }
}

export function createHeaderAuthProvider(options: {
  headerName: string
  encoding: PrincipalEncoding
}): ApiAuthProvider {
  return {
    getPrincipal(request: HttpRequest): AuthenticatedPrincipal | null {
      return parseHeaderPrincipal(request.headers.get(options.headerName), options.encoding)
    },
  }
}
