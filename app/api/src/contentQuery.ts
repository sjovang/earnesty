import type { ApiRuntimeConfig, MetadataFieldConfig } from './config/runtime.js'

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

function metadataExpression(field: MetadataFieldConfig): string {
  return field.type === 'slug' ? `${field.field}.current` : field.field
}

export function buildListDocumentsQuery(config: ApiRuntimeConfig): string {
  const typeNames = config.content.typeOrder
  const typeFilter = typeNames.map((typeName) => quote(typeName)).join(', ')
  const titleSelect = selectByType(
    typeNames,
    (typeName) => config.content.types[typeName]!.titleField,
    "''",
  )
  const publishedAtSelect = selectByType(
    typeNames,
    (typeName) => config.content.types[typeName]!.publishedAtField,
    'null',
  )
  const bodySelect = selectByType(
    typeNames,
    (typeName) => `${config.content.types[typeName]!.bodyField}[_type == "block"][0..10]`,
    '[]',
  )
  const sortDateSelect = selectByType(
    typeNames,
    (typeName) => `coalesce(${config.content.types[typeName]!.publishedAtField}, _createdAt)`,
    '_createdAt',
  )
  return `*[_type in [${typeFilter}]] | order(${sortDateSelect} desc) {
    _id,
    _type,
    _createdAt,
    _updatedAt,
    "publishedAt": ${publishedAtSelect},
    "title": ${titleSelect},
    "body": ${bodySelect}
  }`
}

export function buildGetDocumentQuery(config: ApiRuntimeConfig): string {
  const typeNames = config.content.typeOrder
  const typeFilter = typeNames.map((typeName) => quote(typeName)).join(', ')
  const titleSelect = selectByType(
    typeNames,
    (typeName) => config.content.types[typeName]!.titleField,
    "''",
  )
  const publishedAtSelect = selectByType(
    typeNames,
    (typeName) => config.content.types[typeName]!.publishedAtField,
    'null',
  )
  const bodySelect = selectByType(
    typeNames,
    (typeName) => config.content.types[typeName]!.bodyField,
    '[]',
  )
  const metadataKeys = Array.from(
    new Set(
      typeNames.flatMap((typeName) => config.content.types[typeName]!.metadataFields.map((field) => field.key)),
    ),
  )
  const metadataProjection = metadataKeys.length
    ? metadataKeys
      .map((key) => {
        const valueSelect = selectByType(
          typeNames,
          (typeName) => {
            const field = config.content.types[typeName]!.metadataFields.find((item) => item.key === key)
            return field ? metadataExpression(field) : 'null'
          },
          'null',
        )
        return `"${key}": ${valueSelect}`
      })
      .join(',\n      ')
    : ''

  return `*[_type in [${typeFilter}] && _id == $id][0]{
    _id,
    _type,
    _createdAt,
    _updatedAt,
    "publishedAt": ${publishedAtSelect},
    "title": ${titleSelect},
    "body": ${bodySelect},
    "metadata": {${metadataProjection}}
  }`
}
