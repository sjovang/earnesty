import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { parseClientPrincipal } from '../shared.js'

app.http('getUser', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'me',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const principal = parseClientPrincipal(
      request.headers.get('x-ms-client-principal'),
    )
    if (!principal) {
      return { status: 401, jsonBody: { error: 'Not authenticated' } }
    }

    return {
      status: 200,
      jsonBody: {
        identityProvider: principal.identityProvider,
        userId: principal.userId,
        userDetails: principal.userDetails,
        userRoles: principal.userRoles,
      },
    }
  },
})
