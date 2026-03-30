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
const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
  if (DEV) console.log('[auth]', ...args)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<SanityUser | null>(null)
  const providers = ref<SanityAuthProvider[]>([])
  const error = ref<string | null>(null)
  const corsError = ref<string | null>(null) // set when Sanity rejects the origin
  const isAuthenticated = computed(() => !!token.value)

  /** Redirect the browser to a provider login page. Sanity will redirect back to /. */
  function loginWith(providerUrl: string) {
    const origin = window.location.origin
    const url = new URL(providerUrl)
    url.searchParams.set('origin', origin)
    log('Provider URL before redirect:', url.toString())
    window.location.href = url.toString()
  }

  /** Fetch the list of configured auth providers for this Sanity project. */
  async function fetchProviders() {
    if (providers.value.length) return
    log(`Fetching providers for project ${PROJECT_ID}`)
    try {
      const res = await fetch(
        `https://api.sanity.io/v2021-06-07/auth/providers?projectId=${PROJECT_ID}`,
      )
      if (res.ok) {
        const data = (await res.json()) as { providers: SanityAuthProvider[] }
        providers.value = data.providers
        log('Providers loaded:', data.providers.map(p => p.name))
      } else {
        const msg = `Failed to load sign-in providers (${res.status})`
        log(msg, await res.text())
        error.value = msg
      }
    } catch (err) {
      const msg = 'Could not reach Sanity to load sign-in providers'
      console.error('[auth]', msg, err)
      error.value = msg
    }
  }

  function setToken(t: string) {
    token.value = t
    localStorage.setItem(TOKEN_KEY, t)
    log('Token saved')
  }

  function logout() {
    log('Logging out')
    token.value = null
    user.value = null
    error.value = null
    localStorage.removeItem(TOKEN_KEY)
  }

  function clearError() {
    error.value = null
    corsError.value = null
  }

  async function fetchUser() {
    if (!token.value) return
    log('Fetching user info from /v2021-06-07/users/me')
    try {
      const res = await fetch('/v2021-06-07/users/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      log(`/users/me response: ${res.status}`)
      if (res.status === 401) {
        console.warn('[auth] /users/me returned 401 — token may be expired or invalid')
        logout() // clears token and error; set error after so the watcher fires with it
        error.value = 'Your session has expired. Please sign in again.'
        return
      }
      if (!res.ok) {
        const body = await res.text()
        const msg = `Failed to load your account (${res.status})`
        console.warn('[auth]', msg, body)
        error.value = msg
        return
      }
      user.value = (await res.json()) as SanityUser
      log('User loaded:', user.value.name, user.value.email)
    } catch (err) {
      const msg = 'Could not reach Sanity to verify your session'
      console.error('[auth]', msg, err)
      error.value = msg
    }
  }

  async function initialize() {
    // Skip initialization on the /callback route — CallbackView handles that.
    if (window.location.pathname === '/callback') return

    log('Initializing — URL:', window.location.href)
    log('Query string:', window.location.search)
    log('Hash:', window.location.hash)

    // Check for token in URL — Sanity appends ?token= when redirecting to the root origin.
    // Also handle #token= (some providers use hash fragments).
    const urlParams = new URLSearchParams(window.location.search)
    const hashParams = new URLSearchParams(window.location.hash.slice(1))
    const urlToken = urlParams.get('token') ?? hashParams.get('token')
    if (urlToken) {
      log('Token received in URL — saving to localStorage')
      setToken(urlToken)
      const clean = new URL(window.location.href)
      clean.searchParams.delete('token')
      window.history.replaceState({}, '', clean.toString())
    }

    const params = new URLSearchParams(window.location.search)
    const authError = params.get('auth_error')
    if (authError === 'cors') {
      const corsOrigin = decodeURIComponent(params.get('cors_origin') ?? window.location.origin)
      corsError.value = corsOrigin
      const clean = new URL(window.location.href)
      clean.searchParams.delete('auth_error')
      clean.searchParams.delete('cors_origin')
      window.history.replaceState({}, '', clean.toString())
    } else if (authError) {
      error.value = decodeURIComponent(authError)
      const clean = new URL(window.location.href)
      clean.searchParams.delete('auth_error')
      window.history.replaceState({}, '', clean.toString())
    }

    // Token is always read from localStorage (written by CallbackView after redirect)
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored && stored !== token.value) {
      setToken(stored)
    }

    if (token.value) {
      log('Resuming session from localStorage')
      await fetchUser()
    } else {
      log('No token — unauthenticated')
    }
  }

  async function handleCallbackToken(t: string) {
    setToken(t)
    await fetchUser()
  }

  function handleCallbackError(code: string, desc: string | null, corsOrigin: string | null) {
    if (code === 'cors') {
      corsError.value = corsOrigin ?? window.location.origin
    } else {
      error.value = decodeURIComponent(desc ?? code)
    }
  }

  return { token, user, providers, error, corsError, isAuthenticated, loginWith, fetchProviders, logout, clearError, initialize, handleCallbackToken, handleCallbackError }
})


