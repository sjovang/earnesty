import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface SanityUser {
  id: string
  name: string
  email: string
  profileImage?: string
}

const TOKEN_KEY = 'earnesty-auth-token'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem(TOKEN_KEY))
  const user = ref<SanityUser | null>(null)
  const isAuthenticated = computed(() => !!token.value)

  function login() {
    const origin = window.location.origin + window.location.pathname
    const url = `https://api.sanity.io/v2021-06-07/auth/login?origin=${encodeURIComponent(origin)}&label=Earnesty`
    window.location.href = url
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
      const res = await fetch('/v2021-10-04/users/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (res.status === 401) {
        logout()
        return
      }
      if (res.ok) {
        user.value = (await res.json()) as SanityUser
      }
    } catch (err) {
      console.error('[auth] Failed to fetch user info:', err)
    }
  }

  async function initialize() {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get('token')
    if (urlToken) {
      setToken(urlToken)
      const clean = new URL(window.location.href)
      clean.searchParams.delete('token')
      window.history.replaceState({}, '', clean.toString())
    }

    if (token.value) {
      await fetchUser()
    }
  }

  return { token, user, isAuthenticated, login, logout, initialize }
})
