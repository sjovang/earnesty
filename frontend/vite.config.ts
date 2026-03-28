import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

const SANITY_PROJECT_ID = process.env['VITE_SANITY_PROJECT_ID'] ?? '5ibtsfdc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    // Aspire injects VITE_PORT with the port it expects the dev server on.
    port: process.env['VITE_PORT'] ? parseInt(process.env['VITE_PORT']) : 5173,
    strictPort: true,
    // Bind to all interfaces so the Aspire host can reach the dev server.
    host: true,
    proxy: {
      // Proxy Sanity API requests through the dev server to avoid CORS issues.
      // The Sanity client is configured (in dev) to send requests to /v20xx-xx-xx/…
      // which the proxy forwards to the real Sanity API host.
      '/v2024-01-01': {
        target: `https://${SANITY_PROJECT_ID}.api.sanity.io`,
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
