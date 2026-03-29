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
  const isAuthenticated = computed(() => !!token.value)

  /** Open a provider login popup. Posts a token message back when complete. */
  function loginWith(providerUrl: string) {
    const origin = window.location.origin
    const url = new URL(providerUrl)
    url.searchParams.set('origin', origin)
    const target = url.toString()
    log(`Origin sent to Sanity: ${origin}`)
    log(`Opening OAuth popup: ${target}`)

    const popup = window.open(target, 'sanity-auth', 'width=620,height=720,menubar=no,toolbar=no,scrollbars=yes')

    if (!popup || popup.closed) {
      // Popup blocked — fall back to full-page redirect (initialize() will pick up token on reload)
      log('Popup blocked, falling back to full-page redirect')
      window.location.href = target
      return
    }

    popup.focus()

    const messageHandler = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'sanity-auth-token' || !event.data.token) return
      window.removeEventListener('message', messageHandler)
      clearInterval(pollInterval)
      log('Token received via postMessage')
      setToken(event.data.token as string)
      await fetchUser()
    }

    window.addEventListener('message', messageHandler)

    // Clean up listener if the user closes the popup without completing auth
    const pollInterval = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollInterval)
        window.removeEventListener('message', messageHandler)
        log('OAuth popup closed without token')
      }
    }, 500)
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
        error.value = 'Your session has expired. Please sign in again.'
        logout()
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
    log('Initializing — URL:', window.location.href)

    // Check for OAuth error returned by Sanity (e.g. origin not allowed)
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get('error')
    if (oauthError) {
      const description = params.get('error_description') ?? oauthError
      console.error('[auth] OAuth error from Sanity:', description)
      error.value = `Sign-in failed: ${description}. Make sure "${window.location.origin}" is added to CORS Origins in your Sanity project settings.`
      const clean = new URL(window.location.href)
      clean.searchParams.delete('error')
      clean.searchParams.delete('error_description')
      window.history.replaceState({}, '', clean.toString())
      return
    }

    // Handle token from query string (?token=) — standard Sanity OAuth redirect
    let urlToken = params.get('token')

    // Fallback: some flows return token in hash fragment (#token=)
    if (!urlToken && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      urlToken = hashParams.get('token')
      if (urlToken) log('Token found in hash fragment')
    }

    if (urlToken) {
      log('Token found in URL, saving...')
      setToken(urlToken)
      const clean = new URL(window.location.href)
      clean.searchParams.delete('token')
      clean.hash = ''
      window.history.replaceState({}, '', clean.toString())
    } else if (token.value) {
      log('Resuming session from localStorage')
    } else {
      log('No token — unauthenticated')
    }

    if (token.value) await fetchUser()
  }

  return { token, user, providers, error, isAuthenticated, loginWith, fetchProviders, logout, clearError, initialize }
})

