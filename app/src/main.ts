import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { loadAppInsights } from './services/appInsights'

loadAppInsights()

if (import.meta.env.DEV) {
  try {
    const _log: string[] = JSON.parse(sessionStorage.getItem('_url_log') ?? '[]')
    _log.push(`${new Date().toISOString()}  ${window.location.href}`)
    if (_log.length > 6) _log.shift()
    sessionStorage.setItem('_url_log', JSON.stringify(_log))
    console.log('[boot] URL log (persisted across navigations):', _log)
  } catch {
    // ignore errors from non-critical logging
  }
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
