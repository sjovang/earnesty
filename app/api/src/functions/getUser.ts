import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { requireAuthenticatedPrincipal } from '../shared.js'

app.http('getUser', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    return {
      status: 200,
      jsonBody: {
        identityProvider: auth.principal.identityProvider,
        userId: auth.principal.userId,
        userDetails: auth.principal.userDetails,
        userRoles: auth.principal.userRoles,
      },
    }
  },
})
