import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'
import { getGrammarAvailability } from '../grammar/policy.js'

interface LanguageToolResponse {
  matches?: Array<{
    message?: string
    shortMessage?: string
    offset?: number
    length?: number
    replacements?: Array<{ value?: string }>
    rule?: { id?: string; description?: string; issueType?: string }
  }>
}

interface RateLimitBucket {
  windowStartMs: number
  count: number
}

const RATE_LIMIT_WINDOW_MS = 60_000
const rateLimitBuckets = new Map<string, RateLimitBucket>()

function rateLimitKey(principal: { identityProvider: string; userId: string }): string {
  return `${principal.identityProvider}:${principal.userId}`
}

function consumeRateLimit(
  principal: { identityProvider: string; userId: string },
  limit: number,
  nowMs: number,
): { allowed: boolean; retryAfterSeconds?: number } {
  const key = rateLimitKey(principal)
  const existing = rateLimitBuckets.get(key)

  if (!existing || nowMs - existing.windowStartMs >= RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, { windowStartMs: nowMs, count: 1 })
    return { allowed: true }
  }

  if (existing.count >= limit) {
    const retryAfterMs = Math.max(existing.windowStartMs + RATE_LIMIT_WINDOW_MS - nowMs, 0)
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) }
  }

  existing.count += 1
  return { allowed: true }
}

function pruneRateLimitBuckets(nowMs: number): void {
  if (rateLimitBuckets.size < 1000) return
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (nowMs - bucket.windowStartMs >= RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitBuckets.delete(key)
    }
  }
}

export function clearGrammarRateLimiter(): void {
  rateLimitBuckets.clear()
}

app.http('checkGrammar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'grammar/check',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response
    const principal = auth.principal

    let body: { text: unknown; language?: unknown }
    try {
      body = (await request.json()) as { text: unknown; language?: unknown }
    } catch {
      return { status: 400, jsonBody: { error: 'Invalid JSON body' } }
    }

    if (typeof body.text !== 'string' || !body.text.trim()) {
      return { status: 400, jsonBody: { error: '"text" is required' } }
    }

    const text = body.text.trim()
    if (text.length > 20_000) {
      return { status: 400, jsonBody: { error: '"text" exceeds 20000 characters' } }
    }

    const language = typeof body.language === 'string' && body.language.trim()
      ? body.language.trim()
      : 'auto'

    const config = getApiRuntimeConfig()
    const availability = getGrammarAvailability(config)
    if (!availability.advancedAvailable) {
      return {
        status: 503,
        jsonBody: { error: 'Advanced grammar is unavailable because API key is not configured' },
      }
    }

    const nowMs = Date.now()
    pruneRateLimitBuckets(nowMs)
    const quota = consumeRateLimit(principal, config.grammar.rateLimitRpm, nowMs)
    if (!quota.allowed) {
      const retryAfterSeconds = quota.retryAfterSeconds ?? 1
      return {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSeconds) },
        jsonBody: {
          error: `Too many grammar requests. Try again in ${retryAfterSeconds}s.`,
          retryAfterSeconds,
        },
      }
    }

    const params = new URLSearchParams({
      text,
      language,
      enabledOnly: 'false',
    })
    if (config.grammar.apiKey) {
      params.set('apiKey', config.grammar.apiKey)
    }

    let upstream: Response
    try {
      upstream = await fetch(config.grammar.apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    } catch (error) {
      console.error('[checkGrammar]', error)
      return { status: 502, jsonBody: { error: 'Failed to check grammar' } }
    }

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return {
          status: 429,
          jsonBody: { error: 'Grammar provider is rate limited. Please try again shortly.' },
        }
      }
      return { status: 502, jsonBody: { error: 'Grammar service unavailable' } }
    }

    const payload = (await upstream.json()) as LanguageToolResponse
    const matches = (payload.matches ?? []).map((match) => ({
      message: match.message ?? '',
      shortMessage: match.shortMessage ?? '',
      offset: typeof match.offset === 'number' ? match.offset : 0,
      length: typeof match.length === 'number' ? match.length : 0,
      replacements: (match.replacements ?? [])
        .map((replacement) => ({ value: replacement.value ?? '' }))
        .filter((replacement) => replacement.value.length > 0),
      rule: {
        id: match.rule?.id ?? '',
        description: match.rule?.description ?? '',
        issueType: match.rule?.issueType ?? 'grammar',
      },
    }))

    return {
      status: 200,
      jsonBody: {
        language,
        matches,
      },
    }
  },
})
