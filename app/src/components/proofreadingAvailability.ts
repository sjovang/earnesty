import type { GrammarCapabilityResult } from '../services/api'

export type AdvancedUnavailableReason = 'not_authenticated' | 'missing_api_key' | null

export function advancedUnavailableReason(
  isAuthenticated: boolean,
  capability: GrammarCapabilityResult | null,
): AdvancedUnavailableReason {
  if (!isAuthenticated) return 'not_authenticated'
  if (capability && !capability.advancedAvailable && capability.reason === 'missing_api_key') {
    return 'missing_api_key'
  }
  return null
}

export function advancedUnavailableTooltip(reason: AdvancedUnavailableReason): string | undefined {
  if (reason === 'not_authenticated') {
    return 'Sign in to use Advanced grammar'
  }
  if (reason === 'missing_api_key') {
    return 'Advanced grammar requires a configured LanguageTool API key'
  }
  return undefined
}
