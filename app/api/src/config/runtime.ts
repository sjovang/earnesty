export interface ApiRuntimeConfig {
  sanity: {
    projectId: string
    token: string
    dataset: string
    apiVersion: string
  }
  content: {
    documentType: string
    draftPrefix: string
    titleField: string
    bodyField: string
    slugField: string
    publishedAtField: string
  }
}

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

  cachedConfig = {
    sanity: {
      projectId: projectId ?? 'unset',
      token: token ?? 'unset',
      dataset: envString(process.env['SANITY_DATASET']) ?? 'production',
      apiVersion: envString(process.env['SANITY_API_VERSION']) ?? '2024-01-01',
    },
    content: {
      documentType: readFieldName(process.env['SANITY_DOCUMENT_TYPE'], 'blog', 'SANITY_DOCUMENT_TYPE'),
      draftPrefix,
      titleField: readFieldName(process.env['SANITY_TITLE_FIELD'], 'title', 'SANITY_TITLE_FIELD'),
      bodyField: readFieldName(process.env['SANITY_BODY_FIELD'], 'body', 'SANITY_BODY_FIELD'),
      slugField: readFieldName(process.env['SANITY_SLUG_FIELD'], 'slug', 'SANITY_SLUG_FIELD'),
      publishedAtField: readFieldName(
        process.env['SANITY_PUBLISHED_AT_FIELD'],
        'publishedAt',
        'SANITY_PUBLISHED_AT_FIELD',
      ),
    },
  }

  return cachedConfig
}

export function clearApiRuntimeConfigCache(): void {
  cachedConfig = null
}

export function isDraftDocumentId(id: string): boolean {
  return id.startsWith(getApiRuntimeConfig().content.draftPrefix)
}

export function toPublishedDocumentId(draftId: string): string {
  const prefix = getApiRuntimeConfig().content.draftPrefix
  return draftId.slice(prefix.length)
}
