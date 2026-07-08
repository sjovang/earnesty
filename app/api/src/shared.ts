import { createClient, type SanityClient } from '@sanity/client'
import type { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getApiRuntimeConfig } from './config/runtime.js'
import { getApiAuthBoundary } from './auth/provider.js'
import type { AuthenticatedPrincipal } from './auth/types.js'

let _client: SanityClient | null = null

/** Returns a lazily-initialised Sanity client.
 *  Deferring creation to first use (inside a request handler) ensures the
 *  module can be loaded and function registrations can run even if env vars
 *  are not yet available at cold-start time. */
export function getSanityClient(): SanityClient {
  if (!_client) {
    const config = getApiRuntimeConfig()
    _client = createClient({
      projectId: config.sanity.projectId,
      dataset: config.sanity.dataset,
      apiVersion: config.sanity.apiVersion,
      token: config.sanity.token,
      useCdn: false,
    })
  }
  return _client
}

export function requireAuthenticatedPrincipal(
  request: HttpRequest,
): { principal: AuthenticatedPrincipal } | { response: HttpResponseInit } {
  const principal = getApiAuthBoundary().getPrincipal(request)
  if (!principal) {
    return { response: { status: 401, jsonBody: { error: 'Not authenticated' } } }
  }
  return { principal }
}
