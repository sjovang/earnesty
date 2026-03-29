<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'

const TOKEN_KEY = 'earnesty-auth-token'
const router = useRouter()
const DEV = import.meta.env.DEV

function log(...args: unknown[]) {
  if (DEV) console.log('[auth/callback]', ...args)
}

onMounted(() => {
  log('Full URL:', window.location.href)

  const params = new URLSearchParams(window.location.search)
  const hashParams = new URLSearchParams(window.location.hash.slice(1))

  // Sanity may return the token as ?token= or #token=
  const token = params.get('token') ?? hashParams.get('token')
  const errorCode = params.get('error') ?? hashParams.get('error')
  const errorDesc = params.get('error_description') ?? hashParams.get('error_description')

  log('Query params:', window.location.search)
  log('Hash params:', window.location.hash)

  if (token) {
    log('Token received, saving to localStorage')
    localStorage.setItem(TOKEN_KEY, token)
    void router.replace('/')
  } else if (errorCode) {
    const message = encodeURIComponent(errorDesc ?? errorCode)
    log('OAuth error received:', decodeURIComponent(message))
    void router.replace(`/?auth_error=${message}`)
  } else {
    log('No token or error — check full URL above for clues')
    void router.replace('/?auth_error=Sign-in+did+not+complete.+Please+try+again.')
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
