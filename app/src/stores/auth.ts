import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGetUser, type SwaUser } from '../services/api'

export type { SwaUser }

export const useAuthStore = defineStore('auth', () => {
  const user = ref<SwaUser | null>(null)
  const loading = ref(true)

  const isAuthenticated = computed(() => user.value !== null)

  async function initialize() {
    loading.value = true
    user.value = await apiGetUser()
    loading.value = false
  }

  function login() {
    window.location.href = '/.auth/login/aad'
  }

  function logout() {
    window.location.href = '/.auth/logout'
  }

  return { user, loading, isAuthenticated, initialize, login, logout }
})
