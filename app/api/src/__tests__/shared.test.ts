import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { parseClientPrincipal } from '../shared.js'

describe('parseClientPrincipal', () => {
  it('returns null when header is null', () => {
    expect(parseClientPrincipal(null)).toBeNull()
  })

  it('returns null for invalid base64', () => {
    expect(parseClientPrincipal('not valid base64!!!')).toBeNull()
  })

  it('returns null for valid base64 but invalid JSON', () => {
    const invalid = Buffer.from('not json at all').toString('base64')
    expect(parseClientPrincipal(invalid)).toBeNull()
  })

  it('parses a valid base64-encoded principal', () => {
    const principal = {
      identityProvider: 'aad',
      userId: 'user-123',
      userDetails: 'test@example.com',
      userRoles: ['authenticated', 'anonymous'],
      claims: [{ typ: 'name', val: 'Test User' }],
    }
    const encoded = Buffer.from(JSON.stringify(principal)).toString('base64')
    expect(parseClientPrincipal(encoded)).toEqual(principal)
  })
})

describe('getSanityClient', () => {
  const savedEnv: Record<string, string | undefined> = {}

  beforeEach(() => {
    savedEnv['SANITY_PROJECT_ID'] = process.env['SANITY_PROJECT_ID']
    savedEnv['SANITY_TOKEN'] = process.env['SANITY_TOKEN']
    savedEnv['SANITY_DATASET'] = process.env['SANITY_DATASET']
    vi.resetModules()
  })

  afterEach(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  it('throws when SANITY_PROJECT_ID is missing', async () => {
    delete process.env['SANITY_PROJECT_ID']
    process.env['SANITY_TOKEN'] = 'test-token'
    const { getSanityClient } = await import('../shared.js')
    expect(() => getSanityClient()).toThrow('SANITY_PROJECT_ID')
  })

  it('throws when SANITY_TOKEN is missing', async () => {
    process.env['SANITY_PROJECT_ID'] = 'test-project'
    delete process.env['SANITY_TOKEN']
    const { getSanityClient } = await import('../shared.js')
    expect(() => getSanityClient()).toThrow('SANITY_TOKEN')
  })

  it('throws listing both variables when both are missing', async () => {
    delete process.env['SANITY_PROJECT_ID']
    delete process.env['SANITY_TOKEN']
    const { getSanityClient } = await import('../shared.js')
    expect(() => getSanityClient()).toThrow('SANITY_PROJECT_ID')
    expect(() => getSanityClient()).toThrow('SANITY_TOKEN')
  })

  it('returns a client when required env vars are set', async () => {
    process.env['SANITY_PROJECT_ID'] = 'test-project'
    process.env['SANITY_TOKEN'] = 'test-token'
    const { getSanityClient } = await import('../shared.js')
    expect(getSanityClient()).toBeDefined()
  })

  it('returns the same client instance on repeated calls (singleton)', async () => {
    process.env['SANITY_PROJECT_ID'] = 'test-project'
    process.env['SANITY_TOKEN'] = 'test-token'
    const { getSanityClient } = await import('../shared.js')
    expect(getSanityClient()).toBe(getSanityClient())
  })
})
