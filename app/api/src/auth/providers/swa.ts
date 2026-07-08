import type { HttpRequest } from '@azure/functions'
import type { AuthenticatedPrincipal } from '../types.js'

export interface ApiAuthProvider {
  getPrincipal(request: HttpRequest): AuthenticatedPrincipal | null
}

export function parseSwaClientPrincipal(header: string | null): AuthenticatedPrincipal | null {
  if (!header) return null
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8')
    return JSON.parse(decoded) as AuthenticatedPrincipal
  } catch {
    return null
  }
}

export function createSwaAuthProvider(): ApiAuthProvider {
  return {
    getPrincipal(request: HttpRequest): AuthenticatedPrincipal | null {
      return parseSwaClientPrincipal(request.headers.get('x-ms-client-principal'))
    },
  }
}
