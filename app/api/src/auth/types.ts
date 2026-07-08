export interface AuthenticatedPrincipal {
  identityProvider: string
  userId: string
  userDetails: string
  userRoles: string[]
  claims?: { typ: string; val: string }[]
}
