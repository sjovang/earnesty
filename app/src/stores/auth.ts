import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { apiGetUser, type SwaUser } from '../services/api'
import { runtimeConfig } from '../config/runtime'

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
    window.location.href =
      `${runtimeConfig.auth.loginPath}?${runtimeConfig.auth.postLoginRedirectParam}=/`
  }

  function logout() {
    window.location.href = runtimeConfig.auth.logoutPath
  }

  return { user, loading, isAuthenticated, initialize, login, logout }
})
