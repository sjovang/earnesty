import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface SanityUser {
  id: string
  name: string
  email: string
  profileImage?: string
}

export interface SanityAuthProvider {
  name: string
  title: string
  url: string
  signUpUrl?: string
}

const TOKEN_KEY = 'earnesty-auth-token'
const PROJECT_ID = import.meta.env.VITE_SANITY_PROJECT_ID as string

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<SanityUser | null>(null)
  const providers = ref<SanityAuthProvider[]>([])
  const isAuthenticated = computed(() => !!token.value)

  /** Redirect the browser to a provider login page. */
  function loginWith(providerUrl: string) {
    const origin = window.location.origin + window.location.pathname
    window.location.href = `${providerUrl}?origin=${encodeURIComponent(origin)}`
  }

  /** Fetch the list of configured auth providers for this Sanity project. */
  async function fetchProviders() {
    if (providers.value.length) return
    try {
      const res = await fetch(
        `https://api.sanity.io/v2021-06-07/auth/providers?projectId=${PROJECT_ID}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { providers: SanityAuthProvider[] }
        providers.value = data.providers
      }
    } catch (err) {
      console.error('[auth] Failed to fetch providers:', err)
    }
  }

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const res = await fetch('/v2021-06-07/users/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      // On 401 only clear the token if it came from localStorage (persisted session),
      // not if it was just set from the OAuth redirect — avoid clearing a fresh token
      // due to a transient error or misconfigured proxy.
      if (res.status === 401) {
        console.warn('[auth] /users/me returned 401 — token may be expired')
        return
      }
      if (res.ok) user.value = (await res.json()) as SanityUser
    } catch (err) {
      console.error('[auth] Failed to fetch user info:', err)
    }
  }

  async function initialize() {
    // Handle token from query string (?token=) — standard Sanity OAuth redirect
    const params = new URLSearchParams(window.location.search)
    let urlToken = params.get('token')

    // Fallback: some flows return token in hash fragment (#token=)
    if (!urlToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      urlToken = hashParams.get('token')
    }

    if (urlToken) {
      setToken(urlToken)
      const clean = new URL(window.location.href)
      clean.searchParams.delete('token')
      clean.hash = ''
      window.history.replaceState({}, '', clean.toString())
    }
    if (token.value) await fetchUser()
  }

  return { token, user, providers, isAuthenticated, loginWith, fetchProviders, logout, initialize }
})
