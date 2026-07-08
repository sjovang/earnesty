export interface FrontendRuntimeConfig {
  app: {
    name: string
    introTitle: string
    introLead: string
    introHint: string
    aboutSummary: string
  }
  auth: {
    loginPath: string
    logoutPath: string
    postLoginRedirectParam: string
  }
  content: {
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

export function createRuntimeConfig(env: ImportMetaEnv): FrontendRuntimeConfig {
  const appName = envString(env.VITE_APP_NAME) ?? 'Earnesty'
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

  return {
    app: {
      name: appName,
      introTitle,
      introLead,
      introHint,
      aboutSummary,
    },
    auth: {
      loginPath: readPath(envString(env.VITE_AUTH_LOGIN_PATH), '/.auth/login/aad', 'VITE_AUTH_LOGIN_PATH'),
      logoutPath: readPath(envString(env.VITE_AUTH_LOGOUT_PATH), '/.auth/logout', 'VITE_AUTH_LOGOUT_PATH'),
      postLoginRedirectParam: envString(env.VITE_AUTH_POST_LOGIN_REDIRECT_PARAM) ?? 'post_login_redirect_uri',
    },
    content: {
      documentType: readFieldName(
        envString(env.VITE_SANITY_DOCUMENT_TYPE),
        'blog',
        'VITE_SANITY_DOCUMENT_TYPE',
      ),
      draftPrefix,
      titleField: readFieldName(envString(env.VITE_SANITY_TITLE_FIELD), 'title', 'VITE_SANITY_TITLE_FIELD'),
      bodyField: readFieldName(envString(env.VITE_SANITY_BODY_FIELD), 'body', 'VITE_SANITY_BODY_FIELD'),
      slugField: readFieldName(envString(env.VITE_SANITY_SLUG_FIELD), 'slug', 'VITE_SANITY_SLUG_FIELD'),
      publishedAtField: readFieldName(
        envString(env.VITE_SANITY_PUBLISHED_AT_FIELD),
        'publishedAt',
        'VITE_SANITY_PUBLISHED_AT_FIELD',
      ),
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
