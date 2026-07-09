import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig } from '../config/runtime.js'
import { getGrammarAvailability } from '../grammar/policy.js'

app.http('getGrammarCapability', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'grammar/capability',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    const availability = getGrammarAvailability(getApiRuntimeConfig())
    return {
      status: 200,
      jsonBody: availability,
    }
  },
})
