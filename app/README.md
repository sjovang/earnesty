# Earnesty app (frontend + local dev adapter)

This directory contains the Vue frontend and local dev adapter used by `npm run dev`.

## Local setup

1. Install dependencies:

   ```sh
   npm ci
   cd api && npm ci
   ```

2. Create your env file:

   ```sh
   cp .env.example .env
   ```

3. Set minimum required values in `.env`:

   ```env
   VITE_SANITY_PROJECT_ID=your_project_id
   VITE_SANITY_DATASET=dev
   SANITY_TOKEN=your_sanity_token_with_write_access
   ```

   `SANITY_TOKEN` is consumed by Vite's server-side dev adapter and is not exposed to the browser bundle.

4. Start local development:

   ```sh
   npm run dev
   ```

   Runs on <http://localhost:5173> by default (`strictPort: false`, so Vite may pick another port).

## Useful commands

- `npm run dev` — frontend + local auth/API adapter (default local workflow)
- `npm run dev:swa` — run through Azure SWA CLI (URL: <http://localhost:4280>)
- `npm run build` — type-check + production build
- `npm run test` — frontend test suite
- `npm run test:integration` — frontend integration tests against Sanity dev dataset

## Environment options

`VITE_SANITY_PROJECT_ID` is required. For all other runtime options (schema mapping, auth routes, branding, telemetry, API runtime settings), see the root [README runtime configuration contract](../README.md#runtime-configuration-contract).

## Proofreading controls

- Native proofreading controls are available in **Settings** (`spellcheck`, `autocorrect`, `writing suggestions`, language).
- Advanced grammar mode is **opt-in** and off by default.
- Advanced checks are routed through the app API proxy (`/api/grammar/check`), which can be configured server-side with `GRAMMAR_API_URL` and `GRAMMAR_API_KEY`.
