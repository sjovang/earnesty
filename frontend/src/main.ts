import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Eagerly capture token from URL before any framework code — this survives
// console clears caused by full-page navigation (OAuth redirect flow).
const _earlySearch = new URLSearchParams(window.location.search)
const _earlyHash = new URLSearchParams(window.location.hash.slice(1))
const _earlyToken = _earlySearch.get('token') ?? _earlyHash.get('token')
if (_earlyToken) {
  localStorage.setItem('earnesty-auth-token', _earlyToken)
  const _clean = new URL(window.location.href)
  _clean.searchParams.delete('token')
  window.history.replaceState({}, '', _clean.toString())
}

if (import.meta.env.DEV) {
  // Persist a rolling URL log in sessionStorage so it survives navigation.
  try {
    const _log: string[] = JSON.parse(sessionStorage.getItem('_url_log') ?? '[]')
    _log.push(`${new Date().toISOString()}  ${window.location.href}`)
    if (_log.length > 6) _log.shift()
    sessionStorage.setItem('_url_log', JSON.stringify(_log))
    console.log('[boot] URL log (persisted across navigations):', _log)
    if (_earlyToken) console.log('[boot] ✅ Token captured early from URL')
  } catch {}
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
