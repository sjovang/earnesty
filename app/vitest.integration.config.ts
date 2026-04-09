import { defineConfig } from 'vitest/config'

// In integration tests, import.meta.env.DEV must be false so that
// sanity.ts uses a direct Sanity connection instead of the Vite dev proxy
// (which is not running during CI).
export default defineConfig({
  define: {
    'import.meta.env.DEV': JSON.stringify(false),
    'import.meta.env.PROD': JSON.stringify(true),
  },
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: { url: 'http://localhost:5173' },
    },
    include: ['src/**/*.integration.test.ts'],
  },
})
