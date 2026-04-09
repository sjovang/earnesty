import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5173',
      },
    },
    env: {
      VITE_SANITY_PROJECT_ID: 'test-project-id',
      VITE_SANITY_DATASET: 'production',
    },
  },
})
