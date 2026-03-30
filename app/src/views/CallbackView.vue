<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
  if (DEV) console.log('[auth/callback]', ...args)
}

onMounted(async () => {
  log('Full URL:', window.location.href)

  const params = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.slice(1))

  const token = params.get('token') ?? hashParams.get('token')
  const errorCode = params.get('error') ?? hashParams.get('error')
  const errorDesc = params.get('error_description') ?? hashParams.get('error_description')

  log('Query params:', window.location.search)
  log('Hash params:', window.location.hash)

  if (token) {
    log('Token received — updating auth store and fetching user')
    await auth.handleCallbackToken(token)
    void router.replace('/')
  } else if (errorCode) {
    log('OAuth error received:', errorCode, errorDesc)
    auth.handleCallbackError(errorCode, errorDesc, null)
    void router.replace('/')
  } else {
    // Sanity silently redirects here without a token when the origin is not whitelisted.
    log('No token — likely CORS not configured for', window.location.origin)
    auth.handleCallbackError('cors', null, window.location.origin)
    void router.replace('/')
  }
})
</script>

<template>
  <div class="callback">
    <p>Completing sign-in…</p>
  </div>
</template>

<style scoped>
.callback {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  font-size: 0.9rem;
  color: var(--ctp-subtext0);
}
</style>
