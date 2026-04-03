import { createClient } from '@sanity/client'

export const sanityClient = createClient({
  projectId: process.env['SANITY_PROJECT_ID']!,
  dataset: process.env['SANITY_DATASET'] ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env['SANITY_TOKEN']!,
  useCdn: false,
})

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
