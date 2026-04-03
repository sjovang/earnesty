import { createClient, type SanityClient } from '@sanity/client'

let _client: SanityClient | null = null

/** Returns a lazily-initialised Sanity client.
 *  Deferring creation to first use (inside a request handler) ensures the
 *  module can be loaded and function registrations can run even if env vars
 *  are not yet available at cold-start time. */
export function getSanityClient(): SanityClient {
  if (!_client) {
    const projectId = process.env['SANITY_PROJECT_ID']
    const token = process.env['SANITY_TOKEN']
    if (!projectId || !token) {
      const missing = [
        !projectId && 'SANITY_PROJECT_ID',
        !token && 'SANITY_TOKEN',
      ].filter(Boolean).join(', ')
      throw new Error(
        `Missing required environment variable(s): ${missing}`,
      )
    }
    _client = createClient({
      projectId,
      dataset: process.env['SANITY_DATASET'] ?? 'production',
      apiVersion: '2024-01-01',
      token,
      useCdn: false,
    })
  }
  return _client
}

export interface ClientPrincipal {
  identityProvider: string
  userId: string
  userDetails: string
  userRoles: string[]
  claims: { typ: string; val: string }[]
}

/** Parses the SWA client principal from the request header. */
export function parseClientPrincipal(
  header: string | null,
): ClientPrincipal | null {
  if (!header) return null
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8')
    return JSON.parse(decoded) as ClientPrincipal
  } catch {
    return null
  }
}
