import type { SanityBodyBlock, BlogDocument } from './sanity'

const LOGIN_PATH = '/.auth/login/aad'

async function apiFetch<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (res.status === 401) {
    window.location.href = LOGIN_PATH
    throw new Error('Not authenticated')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `API error ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

/** Saves PortableText blocks to an existing Sanity document via the API proxy. */
export async function apiSaveDocument(
  id: string,
  blocks: SanityBodyBlock[],
): Promise<void> {
  await apiFetch<void>(`/api/sanity/documents/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ blocks }),
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

export interface SwaUser {
  identityProvider: string
  userId: string
  userDetails: string
  userRoles: string[]
}

/** Fetches the current user from the SWA auth endpoint. */
export async function apiGetUser(): Promise<SwaUser | null> {
  try {
    const res = await fetch('/.auth/me')
    if (!res.ok) return null
    const data = (await res.json()) as { clientPrincipal: SwaUser | null }
    return data.clientPrincipal
  } catch {
    return null
  }
}
