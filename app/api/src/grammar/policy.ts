import type { ApiRuntimeConfig } from '../config/runtime.js'

export type GrammarAvailabilityReason = 'missing_api_key'

export interface GrammarAvailability {
  advancedAvailable: boolean
  reason?: GrammarAvailabilityReason
}

export function getGrammarAvailability(config: ApiRuntimeConfig): GrammarAvailability {
  if (config.grammar.requireApiKey && !config.grammar.apiKey) {
    return { advancedAvailable: false, reason: 'missing_api_key' }
  }

  return { advancedAvailable: true }
}
