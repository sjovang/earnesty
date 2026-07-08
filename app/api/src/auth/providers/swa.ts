import type { HttpRequest } from '@azure/functions'
import type { AuthenticatedPrincipal } from '../types.js'
import { createHeaderAuthProvider, parseHeaderPrincipal } from './header.js'

export interface ApiAuthProvider {
  getPrincipal(request: HttpRequest): AuthenticatedPrincipal | null
}

export function parseSwaClientPrincipal(header: string | null): AuthenticatedPrincipal | null {
  return parseHeaderPrincipal(header, 'base64-json')
}

export function createSwaAuthProvider(): ApiAuthProvider {
  return createHeaderAuthProvider({ headerName: 'x-ms-client-principal', encoding: 'base64-json' })
}
