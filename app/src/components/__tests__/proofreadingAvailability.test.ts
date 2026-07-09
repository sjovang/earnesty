import { describe, expect, it } from 'vitest'
import { advancedUnavailableReason, advancedUnavailableTooltip } from '../proofreadingAvailability'

describe('advancedUnavailableReason', () => {
  it('returns sign-in reason when unauthenticated', () => {
    expect(advancedUnavailableReason(false, null)).toBe('not_authenticated')
  })

  it('returns key-missing reason when grammar capability reports missing api key', () => {
    expect(
      advancedUnavailableReason(true, { advancedAvailable: false, reason: 'missing_api_key' }),
    ).toBe('missing_api_key')
  })

  it('returns null when capability allows advanced mode', () => {
    expect(advancedUnavailableReason(true, { advancedAvailable: true })).toBeNull()
  })
})

describe('advancedUnavailableTooltip', () => {
  it('returns a sign-in tooltip for unauthenticated users', () => {
    expect(advancedUnavailableTooltip('not_authenticated')).toBe('Sign in to use Advanced grammar')
  })

  it('returns an api-key tooltip for missing key state', () => {
    expect(advancedUnavailableTooltip('missing_api_key')).toBe(
      'Advanced grammar requires a configured LanguageTool API key',
    )
  })

  it('returns undefined when advanced mode is available', () => {
    expect(advancedUnavailableTooltip(null)).toBeUndefined()
  })
})
