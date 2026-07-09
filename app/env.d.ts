/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_INTRO_TITLE?: string
  readonly VITE_APP_INTRO_LEAD?: string
  readonly VITE_APP_INTRO_HINT?: string
  readonly VITE_APP_ABOUT_SUMMARY?: string
  readonly VITE_SANITY_PROJECT_ID?: string
  readonly VITE_SANITY_DATASET?: string
  readonly VITE_SANITY_API_VERSION?: string
  readonly VITE_SANITY_SCHEMA_CONFIG?: string
  readonly VITE_THEME_CONFIG?: string
  readonly VITE_FONT_CONFIG?: string
  readonly VITE_SANITY_DRAFT_PREFIX?: string
  readonly VITE_AUTH_PROVIDER?: string
  readonly VITE_AUTH_CURRENT_USER_PATH?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_AUTH_LOGOUT_PATH?: string
  readonly VITE_AUTH_POST_LOGIN_REDIRECT_PARAM?: string
  readonly VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string
  readonly VITE_USE_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
