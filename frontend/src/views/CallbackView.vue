<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const CHANNEL = 'earnesty-auth'
const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
  if (DEV) console.log('[auth/callback]', ...args)
}

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')
  const errorCode = params.get('error')
  const errorDesc = params.get('error_description')

  const channel = new BroadcastChannel(CHANNEL)

  if (token) {
    log('Token received, broadcasting auth-success')
    channel.postMessage({ type: 'auth-success', token })
  } else if (errorCode) {
    const message = errorDesc ?? errorCode
    log('OAuth error received:', message)
    channel.postMessage({ type: 'auth-error', message })
  } else {
    log('No token or error in callback URL')
    channel.postMessage({ type: 'auth-error', message: 'Sign-in did not complete. Please try again.' })
  }

  channel.close()

  // If we were opened as a popup, close the window.
  // Otherwise (redirect fallback), navigate home — the main app will read from localStorage.
  if (window.opener) {
    window.close()
  } else {
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
