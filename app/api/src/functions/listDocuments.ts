import {
  app,
  type HttpRequest,
  type HttpResponseInit,
} from '@azure/functions'
import { getSanityClient, requireAuthenticatedPrincipal } from '../shared.js'
import { getApiRuntimeConfig, getContentTypeConfig } from '../config/runtime.js'

function quote(value: string): string {
  return JSON.stringify(value)
}

function selectByType(
  typeNames: string[],
  expressionForType: (typeName: string) => string,
  fallbackExpression: string,
): string {
  const cases = typeNames.map((typeName) => `_type == ${quote(typeName)} => ${expressionForType(typeName)}`)
  return `select(${cases.join(', ')}, ${fallbackExpression})`
}

app.http('listDocuments', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'sanity/documents',
  handler: async (
    request: HttpRequest,
  ): Promise<HttpResponseInit> => {
    const auth = requireAuthenticatedPrincipal(request)
    if ('response' in auth) return auth.response

    try {
      const config = getApiRuntimeConfig()
      const typeNames = config.content.typeOrder
      const typeFilter = typeNames.map((typeName) => quote(typeName)).join(', ')
      const titleSelect = selectByType(
        typeNames,
        (typeName) => getContentTypeConfig(typeName).titleField,
        "''",
      )
      const publishedAtSelect = selectByType(
        typeNames,
        (typeName) => getContentTypeConfig(typeName).publishedAtField,
        'null',
      )
      const bodySelect = selectByType(
        typeNames,
        (typeName) => `${getContentTypeConfig(typeName).bodyField}[_type == "block"][0..10]`,
        '[]',
      )
      const sortDateSelect = selectByType(
        typeNames,
        (typeName) => `coalesce(${getContentTypeConfig(typeName).publishedAtField}, _createdAt)`,
        '_createdAt',
      )
      const docs = await getSanityClient().fetch(
        `*[_type in [${typeFilter}]] | order(${sortDateSelect} desc) {
          _id,
          _type,
          _createdAt,
          _updatedAt,
          "publishedAt": ${publishedAtSelect},
          "title": ${titleSelect},
          "body": ${bodySelect}
        }`,
      )
      return { status: 200, jsonBody: docs }
    } catch (err) {
      console.error('[listDocuments]', err)
      return { status: 502, jsonBody: { error: 'Failed to list documents' } }
    }
  },
})
