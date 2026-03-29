import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Capture URL at the very first moment, before any framework code runs.
if (import.meta.env.DEV) {
  console.log('[boot] href:', window.location.href)
  console.log('[boot] search:', window.location.search)
  console.log('[boot] hash:', window.location.hash)
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
