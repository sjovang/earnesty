import { defineConfig } from 'vitest/config'

// VITE_USE_PROXY is not set here, so sanity.ts uses a direct connection to
// the real Sanity API (instead of routing through the Vite dev proxy).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.integration.test.ts'],
  },
})
