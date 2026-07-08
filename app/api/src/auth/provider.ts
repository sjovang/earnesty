import type { HttpRequest } from '@azure/functions'
import type { AuthenticatedPrincipal } from './types.js'
import { createSwaAuthProvider } from './providers/swa.js'

export interface ApiAuthBoundary {
  getPrincipal(request: HttpRequest): AuthenticatedPrincipal | null
}

const authProvider: ApiAuthBoundary = createSwaAuthProvider()

export function getApiAuthBoundary(): ApiAuthBoundary {
  return authProvider
}
