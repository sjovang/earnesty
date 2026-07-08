export interface FrontendRuntimeConfig {
  app: {
    name: string
    storageNamespace: string
    introTitle: string
    introLead: string
    introHint: string
    aboutSummary: string
  }
  auth: {
    provider: 'swa' | 'api'
    currentUserPath: string
    loginPath: string
    logoutPath: string
    postLoginRedirectParam: string
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
  sanity: {
    projectId: string
    dataset: string
    apiVersion: string
    useProxy: boolean
  }
  telemetry: {
    applicationInsightsConnectionString?: string
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

function envString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function readPath(value: string | undefined, fallback: string, key: string): string {
  const path = value ?? fallback
  if (!path.startsWith('/')) {
    throw new Error(`Invalid runtime configuration: ${key} must start with "/"`)
  }
  return path
}

function readFieldName(value: string | undefined, fallback: string, key: string): string {
  const field = value ?? fallback
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(field)) {
    throw new Error(
      `Invalid runtime configuration: ${key} must match /^[A-Za-z_][A-Za-z0-9_]*$/`,
    )
  }
  return field
}

function readRequiredFieldName(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Invalid runtime configuration: ${key} is required`)
  }
  return readFieldName(value, value, key)
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
    {
      key: 'title',
      label: 'Title',
      field: type.titleField,
      type: 'string',
      required: true,
    },
    {
      key: 'slug',
      label: 'Slug',
      field: type.slugField,
      type: 'slug',
      required: true,
    },
    {
      key: 'publishedAt',
      label: 'Published at',
      field: type.publishedAtField,
      type: 'datetime',
      required: false,
    },
    {
      key: 'tags',
      label: 'Tags',
      field: 'tags',
      type: 'stringArray',
      required: false,
    },
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
    `VITE_SANITY_SCHEMA_CONFIG.types[${index}].name`,
  )
  const label = typeof input.label === 'string' && input.label.trim() ? input.label.trim() : name
  const titleField = readRequiredFieldName(
    typeof input.titleField === 'string' ? input.titleField : undefined,
    `VITE_SANITY_SCHEMA_CONFIG.types[${index}].titleField`,
  )
  const bodyField = readRequiredFieldName(
    typeof input.bodyField === 'string' ? input.bodyField : undefined,
    `VITE_SANITY_SCHEMA_CONFIG.types[${index}].bodyField`,
  )
  const slugField = readRequiredFieldName(
    typeof input.slugField === 'string' ? input.slugField : undefined,
    `VITE_SANITY_SCHEMA_CONFIG.types[${index}].slugField`,
  )
  const publishedAtField = readRequiredFieldName(
    typeof input.publishedAtField === 'string' ? input.publishedAtField : undefined,
    `VITE_SANITY_SCHEMA_CONFIG.types[${index}].publishedAtField`,
  )

  const metadataFields = Array.isArray(input.metadataFields)
    ? input.metadataFields.map((field, fieldIndex) => {
      const raw = (field ?? {}) as Record<string, unknown>
      const rawKey = typeof raw['key'] === 'string' ? raw['key'].trim() : ''
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(rawKey)) {
        throw new Error(
          `Invalid runtime configuration: VITE_SANITY_SCHEMA_CONFIG.types[${index}].metadataFields[${fieldIndex}].key must match /^[A-Za-z_][A-Za-z0-9_]*$/`,
        )
      }
      const key = rawKey
      const labelText = typeof raw['label'] === 'string' && raw['label'].trim()
        ? raw['label'].trim()
        : key
      const fieldName = readFieldName(
        typeof raw['field'] === 'string' ? raw['field'] : undefined,
        key,
        `VITE_SANITY_SCHEMA_CONFIG.types[${index}].metadataFields[${fieldIndex}].field`,
      )
      return {
        key,
        label: labelText,
        field: fieldName,
        type: readMetadataFieldType(
          raw['type'],
          'string',
          `VITE_SANITY_SCHEMA_CONFIG.types[${index}].metadataFields[${fieldIndex}].type`,
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
    throw new Error('Invalid runtime configuration: VITE_SANITY_SCHEMA_CONFIG must be valid JSON', {
      cause: error,
    })
  }

  if (!Array.isArray(parsed.types) || parsed.types.length === 0) {
    throw new Error(
      'Invalid runtime configuration: VITE_SANITY_SCHEMA_CONFIG.types must be a non-empty array',
    )
  }

  const typeOrder: string[] = []
  const types: Record<string, ContentTypeConfig> = {}

  parsed.types.forEach((raw, index) => {
    const config = readSchemaType((raw ?? {}) as SchemaTypeInput, index)
    if (types[config.name]) {
      throw new Error(
        `Invalid runtime configuration: duplicate type "${config.name}" in VITE_SANITY_SCHEMA_CONFIG.types`,
      )
    }
    types[config.name] = config
    typeOrder.push(config.name)
  })

  const defaultType = readFieldName(
    typeof parsed.defaultType === 'string' ? parsed.defaultType : undefined,
    typeOrder[0] ?? fallbackType.name,
    'VITE_SANITY_SCHEMA_CONFIG.defaultType',
  )

  if (!types[defaultType]) {
    throw new Error(
      `Invalid runtime configuration: defaultType "${defaultType}" is not defined in VITE_SANITY_SCHEMA_CONFIG.types`,
    )
  }

  return { defaultType, typeOrder, types }
}

function readAuthProvider(value: string | undefined): FrontendRuntimeConfig['auth']['provider'] {
  const provider = value ?? 'swa'
  switch (provider) {
    case 'swa':
    case 'api':
      return provider
    default:
      throw new Error('Invalid runtime configuration: VITE_AUTH_PROVIDER must be "swa" or "api"')
  }
}

function readStorageNamespace(value: string | undefined, fallback: string): string {
  const ns = value ?? fallback.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!/^[a-z0-9][a-z0-9-]*$/.test(ns)) {
    throw new Error(
      'Invalid runtime configuration: VITE_APP_STORAGE_NAMESPACE must start with a letter or digit and contain only lowercase letters, digits, and hyphens',
    )
  }
  return ns
}


export function createRuntimeConfig(env: ImportMetaEnv): FrontendRuntimeConfig {
  const appName = envString(env.VITE_APP_NAME) ?? 'Earnesty'
  const storageNamespace = readStorageNamespace(envString(env.VITE_APP_STORAGE_NAMESPACE), appName)
  const introTitle = envString(env.VITE_APP_INTRO_TITLE) ?? `${appName} is your space for focused writing`
  const introLead = envString(env.VITE_APP_INTRO_LEAD)
    ?? 'No distractions. No formatting toolbars. Just you and the blank page. All vibes. No QA.'
  const introHint = envString(env.VITE_APP_INTRO_HINT)
    ?? 'Select any part of this text and start typing to replace it — or click anywhere to place your cursor and begin.'
  const aboutSummary = envString(env.VITE_APP_ABOUT_SUMMARY) ?? 'A minimal, focused writing environment.'

  const mode = env.MODE
  const isTest = mode === 'test'
  const projectId = envString(env.VITE_SANITY_PROJECT_ID) ?? (isTest ? 'unset' : undefined)
  if (!projectId) {
    throw new Error('Invalid runtime configuration: VITE_SANITY_PROJECT_ID is required')
  }

  const draftPrefix = envString(env.VITE_SANITY_DRAFT_PREFIX) ?? 'drafts.'
  if (!draftPrefix.endsWith('.')) {
    throw new Error('Invalid runtime configuration: VITE_SANITY_DRAFT_PREFIX must end with "."')
  }

  const authProvider = readAuthProvider(envString(env.VITE_AUTH_PROVIDER))
  const defaultCurrentUserPath = authProvider === 'api' ? '/api/me' : '/.auth/me'
  const schemaConfig = readSchemaConfig(envString(env.VITE_SANITY_SCHEMA_CONFIG))
  const defaultTypeConfig = schemaConfig.types[schemaConfig.defaultType]
  if (!defaultTypeConfig) {
    throw new Error(`Invalid runtime configuration: unknown default type ${schemaConfig.defaultType}`)
  }

  return {
    app: {
      name: appName,
      storageNamespace,
      introTitle,
      introLead,
      introHint,
      aboutSummary,
    },
    auth: {
      provider: authProvider,
      currentUserPath: readPath(
        envString(env.VITE_AUTH_CURRENT_USER_PATH),
        defaultCurrentUserPath,
        'VITE_AUTH_CURRENT_USER_PATH',
      ),
      loginPath: readPath(envString(env.VITE_AUTH_LOGIN_PATH), '/.auth/login/aad', 'VITE_AUTH_LOGIN_PATH'),
      logoutPath: readPath(envString(env.VITE_AUTH_LOGOUT_PATH), '/.auth/logout', 'VITE_AUTH_LOGOUT_PATH'),
      postLoginRedirectParam: envString(env.VITE_AUTH_POST_LOGIN_REDIRECT_PARAM) ?? 'post_login_redirect_uri',
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
    sanity: {
      projectId,
      dataset: envString(env.VITE_SANITY_DATASET) ?? 'production',
      apiVersion: envString(env.VITE_SANITY_API_VERSION) ?? '2024-01-01',
      useProxy: env.VITE_USE_PROXY === 'true',
    },
    telemetry: {
      applicationInsightsConnectionString: envString(env.VITE_APPLICATIONINSIGHTS_CONNECTION_STRING),
    },
  }
}

export const runtimeConfig = createRuntimeConfig(import.meta.env)

export function getContentTypeConfig(typeName: string): ContentTypeConfig {
  return runtimeConfig.content.types[typeName] ?? runtimeConfig.content.types[runtimeConfig.content.defaultType]!
}

export function isDraftDocumentId(id: string): boolean {
  return id.startsWith(runtimeConfig.content.draftPrefix)
}

export function toPublishedDocumentId(draftId: string): string {
  const prefix = runtimeConfig.content.draftPrefix
  if (!draftId.startsWith(prefix)) return draftId
  return draftId.slice(prefix.length)
}

export function draftDocumentIdPattern(): RegExp {
  return new RegExp(`^${escapeRegex(runtimeConfig.content.draftPrefix)}.+$`)
}
