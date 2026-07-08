import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { authProvider, type AuthUser } from '../services/authProvider'

export type { AuthUser }

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => user.value !== null)

  async function initialize() {
    loading.value = true
    user.value = await authProvider.getCurrentUser()
    loading.value = false
  }

  function login() {
    window.location.href = authProvider.getLoginUrl('/')
  }

  function logout() {
    window.location.href = authProvider.getLogoutUrl()
  }

  return { user, loading, isAuthenticated, initialize, login, logout }
})
