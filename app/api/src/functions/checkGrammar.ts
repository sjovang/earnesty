import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'

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

app.http('checkGrammar', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'grammar/check',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

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

    try {
      const config = getApiRuntimeConfig()
      const params = new URLSearchParams({
        text,
        language,
        enabledOnly: 'false',
      })
      if (config.grammar.apiKey) {
        params.set('apiKey', config.grammar.apiKey)
      }

      const upstream = await fetch(config.grammar.apiUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })

      if (!upstream.ok) {
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
    } catch (error) {
      console.error('[checkGrammar]', error)
      return { status: 502, jsonBody: { error: 'Failed to check grammar' } }
    }
  },
})
