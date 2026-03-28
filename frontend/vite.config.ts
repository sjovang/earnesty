import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

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
  },
})
