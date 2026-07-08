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
  readonly VITE_SANITY_DOCUMENT_TYPE?: string
  readonly VITE_SANITY_TITLE_FIELD?: string
  readonly VITE_SANITY_BODY_FIELD?: string
  readonly VITE_SANITY_SLUG_FIELD?: string
  readonly VITE_SANITY_PUBLISHED_AT_FIELD?: string
  readonly VITE_SANITY_DRAFT_PREFIX?: string
  readonly VITE_AUTH_LOGIN_PATH?: string
  readonly VITE_AUTH_LOGOUT_PATH?: string
  readonly VITE_AUTH_POST_LOGIN_REDIRECT_PARAM?: string
  readonly VITE_APPLICATIONINSIGHTS_CONNECTION_STRING?: string
  readonly VITE_USE_PROXY?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
