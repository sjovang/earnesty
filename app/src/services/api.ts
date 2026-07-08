import type { SanityBodyBlock, BlogDocument } from './sanity'
import { trackException } from './appInsights'
import { authProvider } from './authProvider'

export interface ImageAsset {
  assetRef: string
  url: string
  width: number | null
  height: number | null
}

const REDIRECT_COOLDOWN_MS = 10_000
const REDIRECT_TS_KEY = '__auth_redirect_ts'

function redirectToLogin(): never {
  const now = Date.now()
  const last = Number(sessionStorage.getItem(REDIRECT_TS_KEY) || '0')
  if (now - last < REDIRECT_COOLDOWN_MS) {
    throw new Error('Not authenticated (redirect suppressed to prevent loop)')
  }
  sessionStorage.setItem(REDIRECT_TS_KEY, String(now))

  const redirectUri = window.location.pathname + window.location.search + window.location.hash
  window.location.href = authProvider.getLoginUrl(redirectUri)
  throw new Error('Not authenticated')
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
  // when redirect: 'manual' is set. Function-level 401s arrive with status 401.
  if (res.type === 'opaqueredirect' || res.status === 401) {
    redirectToLogin()
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

/** Creates a new blog draft via the API proxy. */
export async function apiCreateDraft(
  title: string,
  slug: string,
): Promise<BlogDocument> {
  return apiFetch<BlogDocument>('/api/sanity/documents', {
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

/** Fetches all blog documents (including drafts) via the API proxy. */
export async function apiListDocuments(): Promise<BlogDocument[]> {
  return apiFetch<BlogDocument[]>('/api/sanity/documents')
}

/** Fetches all image assets from Sanity via the API proxy. */
export async function apiListImages(): Promise<ImageAsset[]> {
  return apiFetch<ImageAsset[]>('/api/sanity/images')
}
