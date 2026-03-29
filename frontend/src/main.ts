import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// OAuth popup callback: if this window was opened by loginWith() and Sanity
// has redirected back here with a token, relay it to the parent and close.
const _params = new URLSearchParams(window.location.search)
const _hash   = new URLSearchParams(window.location.hash.slice(1))
const _token  = _params.get('token') ?? _hash.get('token')

if (window.opener && _token) {
  window.opener.postMessage({ type: 'sanity-auth-token', token: _token }, window.location.origin)
  window.close()
} else {
  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}
