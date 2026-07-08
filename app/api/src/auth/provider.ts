import type { HttpRequest } from '@azure/functions'
import type { AuthenticatedPrincipal } from './types.js'
import { createSwaAuthProvider } from './providers/swa.js'
import { createHeaderAuthProvider } from './providers/header.js'
import { getApiRuntimeConfig } from '../config/runtime.js'

export interface ApiAuthBoundary {
  getPrincipal(request: HttpRequest): AuthenticatedPrincipal | null
}

export function getApiAuthBoundary(): ApiAuthBoundary {
  const { auth } = getApiRuntimeConfig()
  if (auth.provider === 'swa') return createSwaAuthProvider()
  return createHeaderAuthProvider({
    headerName: auth.principalHeader,
    encoding: auth.principalEncoding,
  })
}
