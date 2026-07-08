import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authProvider, type AuthUser } from '../services/authProvider'
import { AUTH_REDIRECT_TS_KEY } from '../services/api'

export type { AuthUser }

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => user.value !== null)

  async function initialize() {
    loading.value = true
    user.value = await authProvider.getCurrentUser()
    if (user.value !== null) {
      sessionStorage.removeItem(AUTH_REDIRECT_TS_KEY)
    }
    loading.value = false
  }

  function invalidateSession() {
    user.value = null
  }

  function login() {
    window.location.href = authProvider.getLoginUrl('/')
  }

  function logout() {
    window.location.href = authProvider.getLogoutUrl()
  }

  return { user, loading, isAuthenticated, initialize, invalidateSession, login, logout }
})
