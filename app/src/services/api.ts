import type { SanityBodyBlock, ContentDocument } from './sanity'
import { trackException } from './appInsights'
import { authProvider } from './authProvider'

export interface ImageAsset {
  assetRef: string
  url: string
  width: number | null
  height: number | null
}

export const AUTH_REDIRECT_TS_KEY = '__auth_redirect_ts'
const REDIRECT_COOLDOWN_MS = 10_000

/** Clears the auth redirect cooldown timestamp, allowing the next redirect to proceed. */
export function clearRedirectTimestamp(): void {
  sessionStorage.removeItem(AUTH_REDIRECT_TS_KEY)
}

/** Thrown when an API call is rejected due to missing or expired authentication. */
export class AuthError extends Error {
  readonly isRedirectSuppressed: boolean

  constructor(message: string, isRedirectSuppressed: boolean) {
    super(message)
    this.name = 'AuthError'
    this.isRedirectSuppressed = isRedirectSuppressed
  }
}

function redirectToLogin(): never {
  const now = Date.now()
  const last = Number(sessionStorage.getItem(AUTH_REDIRECT_TS_KEY) || '0')
  if (now - last < REDIRECT_COOLDOWN_MS) {
    throw new AuthError('Not authenticated (redirect suppressed to prevent loop)', true)
  }
  sessionStorage.setItem(AUTH_REDIRECT_TS_KEY, String(now))

  const redirectUri = window.location.pathname + window.location.search + window.location.hash
  window.location.href = authProvider.getLoginUrl(redirectUri)
  throw new AuthError('Not authenticated', false)
}

function isMultipart(init?: RequestInit): boolean {
  return init?.body instanceof FormData
}

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    redirect: 'manual',
    headers: { ...(!isMultipart(init) && { 'Content-Type': 'application/json' }), ...init?.headers },
  })

  // Platform-level 401s (e.g. from responseOverrides) arrive as opaque redirects
  // when redirect: 'manual' is set — the SWA platform wants a fresh login so we redirect.
  // Function-level 401s arrive with status 401 directly. In that case the frontend
  // session (/.auth/me) is still valid, so silently redirecting to the login page
  // would just loop; instead we throw so the UI can show an actionable sign-in prompt.
  if (res.type === 'opaqueredirect') {
    redirectToLogin()
  }
  if (res.status === 401) {
    throw new AuthError('Not authenticated', false)
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    const message = body.error ?? `API error ${res.status}`
    const error = new Error(message)
    trackException(error, { url, status: String(res.status) })
    throw error
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Saves PortableText blocks and/or title to an existing Sanity document via the API proxy. */
export async function apiSaveDocument(
  id: string,
  blocks?: SanityBodyBlock[],
  title?: string,
): Promise<void> {
  await apiFetch<void>(`/api/sanity/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      ...(blocks !== undefined && { blocks }),
      ...(title !== undefined && { title }),
    }),
  })
}

/** Creates a new content draft via the API proxy. */
export async function apiCreateDraft(
  title: string,
  slug: string,
): Promise<ContentDocument> {
  return apiFetch<ContentDocument>('/api/sanity/documents', {
    method: 'POST',
    body: JSON.stringify({ title, slug }),
  })
}

/** Publishes a draft document, promoting it to published and removing the draft. */
export async function apiPublishDocument(
  id: string,
): Promise<{ _id: string }> {
  return apiFetch<{ _id: string }>(
    `/api/sanity/documents/${encodeURIComponent(id)}/publish`,
    { method: 'POST' },
  )
}

/** Uploads an image file to Sanity via the API proxy. */
export async function apiUploadImage(file: File): Promise<ImageAsset> {
  const form = new FormData()
  form.append('file', file)
  return apiFetch<ImageAsset>('/api/sanity/images', { method: 'POST', body: form })
}

/** Fetches all content documents (including drafts) via the API proxy. */
export async function apiListDocuments(): Promise<ContentDocument[]> {
  return apiFetch<ContentDocument[]>('/api/sanity/documents')
}

/** Fetches all image assets from Sanity via the API proxy. */
export async function apiListImages(): Promise<ImageAsset[]> {
  return apiFetch<ImageAsset[]>('/api/sanity/images')
}
