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
const BROADCAST_CHANNEL = 'earnesty-auth'
const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
  if (DEV) console.log('[auth]', ...args)
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<SanityUser | null>(null)
  const providers = ref<SanityAuthProvider[]>([])
  const error = ref<string | null>(null)
  const pendingAuth = ref(false)
  const isAuthenticated = computed(() => !!token.value)

  let _popup: Window | null = null
  let _popupPoll: ReturnType<typeof setInterval> | null = null
  let _channel: BroadcastChannel | null = null

  function _openChannel() {
    if (_channel) return
    _channel = new BroadcastChannel(BROADCAST_CHANNEL)
    _channel.onmessage = async (event: MessageEvent) => {
      const { type, token: t, message } = event.data as { type: string; token?: string; message?: string }
      if (type === 'auth-success' && t) {
        log('Token received via BroadcastChannel')
        _cleanupPopup()
        setToken(t)
        await fetchUser()
      } else if (type === 'auth-error') {
        log('Auth error via BroadcastChannel:', message)
        _cleanupPopup()
        error.value = message ?? 'Sign-in failed. Please try again.'
      }
    }
  }

  function _cleanupPopup() {
    pendingAuth.value = false
    if (_popupPoll) { clearInterval(_popupPoll); _popupPoll = null }
    if (_popup && !_popup.closed) _popup.close()
    _popup = null
  }

  /**
   * Open a provider login popup. Sanity will redirect back to /callback
   * which broadcasts the token via BroadcastChannel.
   */
  function loginWith(providerUrl: string) {
    error.value = null
    const callbackOrigin = window.location.origin + '/callback'
    const url = new URL(providerUrl)
    url.searchParams.set('origin', callbackOrigin)
    const target = url.toString()
    log(`Opening OAuth popup (origin: ${callbackOrigin})`)

    _openChannel()

    const popup = window.open(target, 'sanity-auth', 'width=480,height=640,menubar=no,toolbar=no,scrollbars=yes')

    if (!popup || popup.closed) {
      log('Popup blocked — falling back to full-page redirect')
      window.location.href = target
      return
    }

    _popup = popup
    popup.focus()
    pendingAuth.value = true

    // Detect if the user closes the popup without completing auth
    _popupPoll = setInterval(() => {
      if (popup.closed) {
        log('OAuth popup closed without completing auth')
        _cleanupPopup()
      }
    }, 500)
  }

  function cancelAuth() {
    log('Auth cancelled by user')
    _cleanupPopup()
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
    _cleanupPopup()
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
    // Open the broadcast channel so we're ready to receive tokens from the callback popup.
    _openChannel()

    if (token.value) {
      log('Resuming session from localStorage')
      await fetchUser()
    } else {
      log('No token — unauthenticated')
    }
  }

  return {
    token, user, providers, error, pendingAuth, isAuthenticated,
    loginWith, cancelAuth, fetchProviders, logout, clearError, initialize,
  }
})

