export interface ApiRuntimeConfig {
  sanity: {
    projectId: string
    token: string
    dataset: string
    apiVersion: string
  }
  content: {
    defaultType: string
    typeOrder: string[]
    types: Record<string, ContentTypeConfig>
    documentType: string
    draftPrefix: string
    titleField: string
    bodyField: string
    slugField: string
    publishedAtField: string
  }
  auth: {
    provider: 'swa' | 'header'
    principalHeader: string
    principalEncoding: 'base64-json' | 'json'
  }
}

export type MetadataFieldType = 'string' | 'slug' | 'datetime' | 'stringArray' | 'boolean'

export interface MetadataFieldConfig {
  key: string
  label: string
  field: string
  type: MetadataFieldType
  required: boolean
}

export interface ContentTypeConfig {
  name: string
  label: string
  titleField: string
  bodyField: string
  slugField: string
  publishedAtField: string
  metadataFields: MetadataFieldConfig[]
}

const DEFAULT_CONTENT_FIELDS = {
  documentType: 'blog',
  titleField: 'title',
  bodyField: 'body',
  slugField: 'slug',
  publishedAtField: 'publishedAt',
} as const

let cachedConfig: ApiRuntimeConfig | null = null

function envString(value: string | undefined): string | undefined {
  return value?.trim() || undefined
}

function readFieldName(value: string | undefined, fallback: string, key: string): string {
  const field = envString(value) ?? fallback
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
    throw new Error(`Invalid runtime configuration: ${key} must match /^[A-Za-z_][A-Za-z0-9_]*$/`)
  }
  return field
}

function readRequiredFieldName(value: string | undefined, key: string): string {
  const field = envString(value)
  if (!field) {
    throw new Error(`Invalid runtime configuration: ${key} is required`)
  }
  return readFieldName(field, field, key)
}

function readMetadataFieldType(
  value: unknown,
  fallback: MetadataFieldType,
  key: string,
): MetadataFieldType {
  const type = typeof value === 'string' && value.trim() ? value.trim() : fallback
  switch (type) {
    case 'string':
    case 'slug':
    case 'datetime':
    case 'stringArray':
    case 'boolean':
      return type
    default:
      throw new Error(
        `Invalid runtime configuration: ${key} must be one of string|slug|datetime|stringArray|boolean`,
      )
  }
}

interface SchemaTypeInput {
  name: unknown
  label?: unknown
  titleField?: unknown
  bodyField?: unknown
  slugField?: unknown
  publishedAtField?: unknown
  metadataFields?: unknown
}

interface SchemaConfigInput {
  defaultType?: unknown
  types?: unknown
}

function defaultMetadataFields(type: {
  titleField: string
  slugField: string
  publishedAtField: string
}): MetadataFieldConfig[] {
  return [
    { key: 'title', label: 'Title', field: type.titleField, type: 'string', required: true },
    { key: 'slug', label: 'Slug', field: type.slugField, type: 'slug', required: true },
    {
      key: 'publishedAt',
      label: 'Published at',
      field: type.publishedAtField,
      type: 'datetime',
      required: false,
    },
    { key: 'tags', label: 'Tags', field: 'tags', type: 'stringArray', required: false },
  ]
}

function defaultContentTypeConfig(): ContentTypeConfig {
  return {
    name: DEFAULT_CONTENT_FIELDS.documentType,
    label: DEFAULT_CONTENT_FIELDS.documentType,
    titleField: DEFAULT_CONTENT_FIELDS.titleField,
    bodyField: DEFAULT_CONTENT_FIELDS.bodyField,
    slugField: DEFAULT_CONTENT_FIELDS.slugField,
    publishedAtField: DEFAULT_CONTENT_FIELDS.publishedAtField,
    metadataFields: defaultMetadataFields({
      titleField: DEFAULT_CONTENT_FIELDS.titleField,
      slugField: DEFAULT_CONTENT_FIELDS.slugField,
      publishedAtField: DEFAULT_CONTENT_FIELDS.publishedAtField,
    }),
  }
}

function readSchemaType(
  input: SchemaTypeInput,
  index: number,
): ContentTypeConfig {
  const name = readRequiredFieldName(
    typeof input.name === 'string' ? input.name : undefined,
    `SANITY_SCHEMA_CONFIG.types[${index}].name`,
  )
  const label = typeof input.label === 'string' && input.label.trim() ? input.label.trim() : name
  const titleField = readRequiredFieldName(
    typeof input.titleField === 'string' ? input.titleField : undefined,
    `SANITY_SCHEMA_CONFIG.types[${index}].titleField`,
  )
  const bodyField = readRequiredFieldName(
    typeof input.bodyField === 'string' ? input.bodyField : undefined,
    `SANITY_SCHEMA_CONFIG.types[${index}].bodyField`,
  )
  const slugField = readRequiredFieldName(
    typeof input.slugField === 'string' ? input.slugField : undefined,
    `SANITY_SCHEMA_CONFIG.types[${index}].slugField`,
  )
  const publishedAtField = readRequiredFieldName(
    typeof input.publishedAtField === 'string' ? input.publishedAtField : undefined,
    `SANITY_SCHEMA_CONFIG.types[${index}].publishedAtField`,
  )
  const metadataFields = Array.isArray(input.metadataFields)
    ? input.metadataFields.map((field, fieldIndex) => {
      const raw = (field ?? {}) as Record<string, unknown>
      const rawKey = typeof raw['key'] === 'string' ? raw['key'].trim() : ''
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(rawKey)) {
        throw new Error(
          `Invalid runtime configuration: SANITY_SCHEMA_CONFIG.types[${index}].metadataFields[${fieldIndex}].key must match /^[A-Za-z_][A-Za-z0-9_]*$/`,
        )
      }
      const key = rawKey
      const labelText = typeof raw['label'] === 'string' && raw['label'].trim()
        ? raw['label'].trim()
        : key
      const fieldName = readFieldName(
        typeof raw['field'] === 'string' ? raw['field'] : undefined,
        key,
        `SANITY_SCHEMA_CONFIG.types[${index}].metadataFields[${fieldIndex}].field`,
      )
      return {
        key,
        label: labelText,
        field: fieldName,
        type: readMetadataFieldType(
          raw['type'],
          'string',
          `SANITY_SCHEMA_CONFIG.types[${index}].metadataFields[${fieldIndex}].type`,
        ),
        required: raw['required'] === true,
      } satisfies MetadataFieldConfig
    })
    : defaultMetadataFields({ titleField, slugField, publishedAtField })

  return {
    name,
    label,
    titleField,
    bodyField,
    slugField,
    publishedAtField,
    metadataFields,
  }
}

function readSchemaConfig(
  value: string | undefined,
): { defaultType: string; typeOrder: string[]; types: Record<string, ContentTypeConfig> } {
  const fallbackType = defaultContentTypeConfig()
  if (!value) {
    return {
      defaultType: fallbackType.name,
      typeOrder: [fallbackType.name],
      types: { [fallbackType.name]: fallbackType },
    }
  }

  let parsed: SchemaConfigInput
  try {
    parsed = JSON.parse(value) as SchemaConfigInput
  } catch (error) {
    throw new Error(
      `Invalid runtime configuration: SANITY_SCHEMA_CONFIG must be valid JSON (${String(error)})`,
    )
  }

  if (!Array.isArray(parsed.types) || parsed.types.length === 0) {
    throw new Error(
      'Invalid runtime configuration: SANITY_SCHEMA_CONFIG.types must be a non-empty array',
    )
  }

  const typeOrder: string[] = []
  const types: Record<string, ContentTypeConfig> = {}
  parsed.types.forEach((raw, index) => {
    const config = readSchemaType((raw ?? {}) as SchemaTypeInput, index)
    if (types[config.name]) {
      throw new Error(
        `Invalid runtime configuration: duplicate type "${config.name}" in SANITY_SCHEMA_CONFIG.types`,
      )
    }
    types[config.name] = config
    typeOrder.push(config.name)
  })

  const defaultType = readFieldName(
    typeof parsed.defaultType === 'string' ? parsed.defaultType : undefined,
    typeOrder[0] ?? fallbackType.name,
    'SANITY_SCHEMA_CONFIG.defaultType',
  )

  if (!types[defaultType]) {
    throw new Error(
      `Invalid runtime configuration: defaultType "${defaultType}" is not defined in SANITY_SCHEMA_CONFIG.types`,
    )
  }

  return { defaultType, typeOrder, types }
}

function readAuthProvider(value: string | undefined): ApiRuntimeConfig['auth']['provider'] {
  const provider = value ?? 'swa'
  switch (provider) {
    case 'swa':
    case 'header':
      return provider
    default:
      throw new Error('Invalid runtime configuration: AUTH_PROVIDER must be "swa" or "header"')
  }
}

function readPrincipalEncoding(value: string | undefined): ApiRuntimeConfig['auth']['principalEncoding'] {
  const encoding = value ?? 'base64-json'
  switch (encoding) {
    case 'base64-json':
    case 'json':
      return encoding
    default:
      throw new Error(
        'Invalid runtime configuration: AUTH_PRINCIPAL_ENCODING must be "base64-json" or "json"',
      )
  }
}

function readHeaderName(value: string | undefined, fallback: string, key: string): string {
  const header = envString(value) ?? fallback
  if (!/^[A-Za-z0-9-]+$/.test(header)) {
    throw new Error(`Invalid runtime configuration: ${key} must contain only letters, digits, and hyphens`)
  }
  return header.toLowerCase()
}

export function getApiRuntimeConfig(): ApiRuntimeConfig {
  if (cachedConfig) return cachedConfig

  const projectId = envString(process.env['SANITY_PROJECT_ID'])
  const token = envString(process.env['SANITY_TOKEN'])
  const missing = [
    !projectId && 'SANITY_PROJECT_ID',
    !token && 'SANITY_TOKEN',
  ].filter(Boolean).join(', ')
  const isTest = process.env['NODE_ENV'] === 'test'
  if (missing && !isTest) {
    throw new Error(`Missing required environment variable(s): ${missing}`)
  }

  const draftPrefix = envString(process.env['SANITY_DRAFT_PREFIX']) ?? 'drafts.'
  if (!draftPrefix.endsWith('.')) {
    throw new Error('Invalid runtime configuration: SANITY_DRAFT_PREFIX must end with "."')
  }

  const authProvider = readAuthProvider(process.env['AUTH_PROVIDER'])
  const defaultPrincipalHeader = authProvider === 'swa'
    ? 'x-ms-client-principal'
    : 'x-authenticated-principal'
  const defaultPrincipalEncoding = authProvider === 'swa' ? 'base64-json' : 'json'
  const schemaConfig = readSchemaConfig(envString(process.env['SANITY_SCHEMA_CONFIG']))
  const defaultTypeConfig = schemaConfig.types[schemaConfig.defaultType]
  if (!defaultTypeConfig) {
    throw new Error(`Invalid runtime configuration: unknown default type ${schemaConfig.defaultType}`)
  }

  cachedConfig = {
    sanity: {
      projectId: projectId ?? 'unset',
      token: token ?? 'unset',
      dataset: envString(process.env['SANITY_DATASET']) ?? 'production',
      apiVersion: envString(process.env['SANITY_API_VERSION']) ?? '2024-01-01',
    },
    content: {
      defaultType: schemaConfig.defaultType,
      typeOrder: schemaConfig.typeOrder,
      types: schemaConfig.types,
      documentType: defaultTypeConfig.name,
      draftPrefix,
      titleField: defaultTypeConfig.titleField,
      bodyField: defaultTypeConfig.bodyField,
      slugField: defaultTypeConfig.slugField,
      publishedAtField: defaultTypeConfig.publishedAtField,
    },
    auth: {
      provider: authProvider,
      principalHeader: readHeaderName(
        process.env['AUTH_PRINCIPAL_HEADER'],
        defaultPrincipalHeader,
        'AUTH_PRINCIPAL_HEADER',
      ),
      principalEncoding: readPrincipalEncoding(process.env['AUTH_PRINCIPAL_ENCODING'] ?? defaultPrincipalEncoding),
    },
  }

  return cachedConfig
}

export function clearApiRuntimeConfigCache(): void {
  cachedConfig = null
}

export function getContentTypeConfig(typeName: string): ContentTypeConfig {
  const config = getApiRuntimeConfig()
  return config.content.types[typeName] ?? config.content.types[config.content.defaultType]!
}

export function isDraftDocumentId(id: string): boolean {
  return id.startsWith(getApiRuntimeConfig().content.draftPrefix)
}

export function toPublishedDocumentId(draftId: string): string {
  const prefix = getApiRuntimeConfig().content.draftPrefix
  return draftId.slice(prefix.length)
}
