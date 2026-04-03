import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const SANITY_PROJECT_ID = process.env['VITE_SANITY_PROJECT_ID'] ?? '5ibtsfdc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    strictPort: false,
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
