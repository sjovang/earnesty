# Earnesty

A minimal, focused writing environment built with [Vue 3](https://vuejs.org) and a [Sanity.io](https://sanity.io) backend.

## Quick start (run your own instance)

### 1. Prerequisites

- [Node.js](https://nodejs.org) **22.x LTS recommended** (minimum supported: `20.19.0`)
- npm (ships with Node.js)
- A Sanity project + dataset
- A Sanity token with read/write access to that dataset (used server-side)
- [pre-commit](https://pre-commit.com) (optional, for local git hooks)

### 2. Install dependencies

```sh
cd app && npm ci && cd api && npm ci
```

### 3. Configure local environment

```sh
cp app/.env.example app/.env
```

Then edit `app/.env` with your Sanity values. Minimum working setup:

```env
VITE_SANITY_PROJECT_ID=your_project_id
VITE_SANITY_DATASET=dev
SANITY_TOKEN=your_sanity_token_with_write_access
```

`SANITY_TOKEN` is read by the local dev adapter in `vite.config.ts` and stays server-side (not exposed to browser code). Never set a `VITE_SANITY_TOKEN` variable.

### 4. Start development server

```sh
cd app && npm run dev
```

Default URL is <http://localhost:5173> (or the next available port because `strictPort` is `false`).

### 5. Optional: run with Azure Static Web Apps CLI

If you want to test the real SWA auth/API surface locally:

```sh
cd app && npm run dev:swa
```

This serves the app through SWA CLI at <http://localhost:4280> and uses `app/api`.

### 6. Optional: install pre-commit hooks

```sh
pre-commit install
```

## Runtime configuration contract

Both frontend and API use typed runtime configuration so you can customize schema mapping, auth endpoints, and branding without code changes.

### Frontend runtime (`VITE_*`)

| Variable | Required | Default / Notes |
|---|---|---|
| `VITE_SANITY_PROJECT_ID` | Yes | — |
| `VITE_SANITY_DATASET` | No | `production` |
| `VITE_SANITY_API_VERSION` | No | `2024-01-01` |
| `VITE_SANITY_SCHEMA_CONFIG` | No | JSON schema config. If unset, the frontend uses a built-in single-type default equivalent to `blog` / `title` / `body` / `slug` / `publishedAt`. |
| `VITE_THEME_CONFIG` | No | JSON theme config for `light` and `dark` themes. If unset, the frontend uses built-in Catppuccin Latte (light) and Macchiato (dark). |
| `VITE_FONT_CONFIG` | No | JSON font-family config. If set, it must provide `sansSerif`, `serif`, and `handwriting`. |
| `VITE_SANITY_DRAFT_PREFIX` | No | `drafts.` (must end with `.`) |
| `VITE_AUTH_PROVIDER` | No | `swa` (`swa` or `api`) |
| `VITE_AUTH_CURRENT_USER_PATH` | No | `/.auth/me` for `swa`, `/api/me` for `api` |
| `VITE_AUTH_LOGIN_PATH` | No | `/.auth/login/aad` |
| `VITE_AUTH_LOGOUT_PATH` | No | `/.auth/logout` |
| `VITE_AUTH_POST_LOGIN_REDIRECT_PARAM` | No | `post_login_redirect_uri` |
| `VITE_APP_NAME` | No | `Earnesty` |
| `VITE_APP_STORAGE_NAMESPACE` | No | Derived from app name (lowercase kebab-case) |
| `VITE_APP_INTRO_TITLE` | No | `${VITE_APP_NAME} is your space for focused writing` |
| `VITE_APP_INTRO_LEAD` | No | Built-in intro lead text |
| `VITE_APP_INTRO_HINT` | No | Built-in intro hint text |
| `VITE_APP_ABOUT_SUMMARY` | No | `A minimal, focused writing environment.` |
| `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` | No | unset |
| `VITE_USE_PROXY` | No | `false` (set to `true` in `.env.development`) |

### API runtime (`SANITY_*`, `AUTH_*`)

| Variable | Required | Default / Notes |
|---|---|---|
| `SANITY_PROJECT_ID` | Yes | — |
| `SANITY_TOKEN` | Yes | — |
| `SANITY_DATASET` | No | `production` |
| `SANITY_API_VERSION` | No | `2024-01-01` |
| `SANITY_SCHEMA_CONFIG` | No | JSON schema config. If unset, the API uses the same built-in single-type default as the frontend. |
| `SANITY_DRAFT_PREFIX` | No | `drafts.` (must end with `.`) |
| `AUTH_PROVIDER` | No | `swa` (`swa` or `header`) |
| `AUTH_PRINCIPAL_HEADER` | No | `x-ms-client-principal` for `swa`, `x-authenticated-principal` for `header` |
| `AUTH_PRINCIPAL_ENCODING` | No | `base64-json` for `swa`, `json` for `header` |
| `GRAMMAR_API_URL` | No | `https://api.languagetool.org/v2/check` |
| `GRAMMAR_API_KEY` | No | unset |
| `GRAMMAR_REQUIRE_API_KEY` | No | `true` (advanced grammar is unavailable without `GRAMMAR_API_KEY`) |
| `GRAMMAR_RATE_LIMIT_RPM` | No | `20` (free-tier-safe default; raise for premium plans) |

Validation is fail-fast: invalid or missing required settings throw explicit runtime errors.

#### Schema config example

`VITE_SANITY_SCHEMA_CONFIG` and `SANITY_SCHEMA_CONFIG` use the same JSON shape:

```json
{
  "defaultType": "blog",
  "types": [
    {
      "name": "blog",
      "label": "Blog",
      "titleField": "title",
      "bodyField": "body",
      "slugField": "slug",
      "publishedAtField": "publishedAt",
      "metadataFields": [
        { "key": "title", "label": "Title", "field": "title", "type": "string", "required": true },
        { "key": "slug", "label": "Slug", "field": "slug", "type": "slug", "required": true },
        { "key": "publishedAt", "label": "Published at", "field": "publishedAt", "type": "datetime" },
        { "key": "tags", "label": "Tags", "field": "tags", "type": "stringArray" }
      ]
    },
    {
      "name": "note",
      "label": "Note",
      "titleField": "name",
      "bodyField": "content",
      "slugField": "path",
      "publishedAtField": "updatedAt"
    }
  ]
}
```

#### Theme config example

`VITE_THEME_CONFIG` uses this JSON shape (both themes are required when set):

```json
{
  "light": {
    "colorScheme": "light",
    "colors": {
      "--ctp-base": "#eff1f5",
      "--ctp-text": "#4c4f69"
    }
  },
  "dark": {
    "colorScheme": "dark",
    "colors": {
      "--ctp-base": "#24273a",
      "--ctp-text": "#cad3f5"
    }
  }
}
```

#### Font config example

`VITE_FONT_CONFIG` uses this JSON shape (all keys are required when set):

```json
{
  "sansSerif": "'Atkinson Hyperlegible', system-ui, sans-serif",
  "serif": "'Domine', Georgia, serif",
  "handwriting": "'Gloria Hallelujah', cursive"
}
```

Default font stacks (when `VITE_FONT_CONFIG` is unset):

- `sansSerif`: `'Atkinson Hyperlegible', system-ui, -apple-system, BlinkMacSystemFont, sans-serif`
- `serif`: `'Domine', Georgia, 'Times New Roman', serif`
- `handwriting`: `'Gloria Hallelujah', 'Comic Sans MS', 'Comic Sans', cursive`

### Fontsource usage

The app bundles default fonts locally with [Fontsource](https://fontsource.org), so it does not fetch fonts from Google Fonts CDN.

If you want custom fonts:

1. Install the package(s), for example:

   ```sh
   cd app && npm install @fontsource/ibm-plex-serif @fontsource/public-sans @fontsource/caveat
   ```

2. Import the font CSS in `app/src/main.ts`, for example:

   ```ts
   import '@fontsource/ibm-plex-serif/400.css'
   import '@fontsource/public-sans/400.css'
   import '@fontsource/caveat/400.css'
   ```

3. Point `VITE_FONT_CONFIG` to those family names:

   ```env
   VITE_FONT_CONFIG={"sansSerif":"'Public Sans', system-ui, sans-serif","serif":"'IBM Plex Serif', Georgia, serif","handwriting":"'Caveat', cursive"}
   ```

When schema config is set, each type must declare `name`, `titleField`, `bodyField`, `slugField`, and `publishedAtField`. The old single-type mapping variables are no longer used as fallbacks. If schema config is unset, the app falls back to this built-in default:

```json
{
  "defaultType": "blog",
  "types": [
    {
      "name": "blog",
      "titleField": "title",
      "bodyField": "body",
      "slugField": "slug",
      "publishedAtField": "publishedAt"
    }
  ]
}
```

### Portability boundary

The core app now treats authentication and current-user discovery as part of an explicit runtime contract instead of assuming Azure Static Web Apps everywhere:

- **Frontend contract:** the app only requires a current-user endpoint, login path, logout path, and redirect parameter. Azure Static Web Apps remains the default through `VITE_AUTH_PROVIDER=swa`, but alternative hosts can point the app at their own endpoints without changing core UI code.
- **API contract:** the server only requires an authenticated principal header that can be parsed as either SWA's `x-ms-client-principal` envelope or a plain JSON header, depending on `AUTH_PROVIDER`.
- **Azure-only adapter surfaces:** `app/public/staticwebapp.config.json`, `app/api/`'s Azure Functions host, `infra/**`, and `.github/workflows/deploy*.yml` remain the Azure deployment path. Alternative hosting targets should preserve the documented runtime contract or replace these adapters explicitly.

## Building for production

```sh
cd app && npm run build
```

Output is written to `app/dist/`.

## GitHub environments

The CI/CD pipelines use two GitHub environments to keep dev and production configuration separate.

### Environments

| Environment | Used by | Purpose |
|-------------|---------|---------|
| `dev` | PR build job (`app.yml`) | Validates PRs against the dev Sanity dataset |
| `production` | Release deploy job (`deploy.yml`) | Builds and deploys to Azure Static Web Apps |

Create these under **Settings → Environments** in the GitHub repository. It is recommended to add a required reviewer on the `production` environment.

### Secrets and variables

Configure the following secrets and variables on **each environment** (not at repository level):

#### `dev` environment

| Secret | Description |
|--------|-------------|
| `VITE_SANITY_PROJECT_ID` | Sanity project ID |
| `VITE_SANITY_DATASET` | Sanity dataset name (e.g. `dev`) |
| `VITE_SANITY_TOKEN` | Sanity API token with read/write access |

| Variable | Description |
|--------|-------------|
| `SANITY_SCHEMA_CONFIG` | Optional schema config JSON. The workflows pass this to both `VITE_SANITY_SCHEMA_CONFIG` and `SANITY_SCHEMA_CONFIG`. Leave it unset to use the built-in default schema. |

#### `production` environment

| Secret | Description |
|--------|-------------|
| `VITE_SANITY_PROJECT_ID` | Sanity project ID (used at build time) |
| `VITE_SANITY_DATASET` | Sanity dataset name (e.g. `production`) |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token from Azure Static Web Apps |
| `ENTRA_CLIENT_ID` | Entra ID App Registration client ID |
| `ENTRA_CLIENT_SECRET` | Entra ID App Registration client secret |
| `ENTRA_TENANT_ID` | Entra ID Directory (tenant) ID |
| `SANITY_TOKEN` | Sanity API token (server-side, for API functions) |
| `SANITY_PROJECT_ID` | Sanity project ID (server-side, for API functions) |
| `SANITY_DATASET` | Sanity dataset name (server-side, for API functions) |

| Variable | Description |
|--------|-------------|
| `SANITY_SCHEMA_CONFIG` | Optional schema config JSON used by build, integration tests, deployment, and SWA runtime settings. Leave it unset to use the built-in default schema. |

Optional runtime overrides are supported for reusable deployments. Configure these as **Azure Static Web App application settings** if you need custom schema/auth mapping:

| Optional SWA App Setting | Default |
|---|---|
| `SANITY_SCHEMA_CONFIG` | unset (uses built-in default schema config) |
| `SANITY_DRAFT_PREFIX` | `drafts.` |
| `AUTH_PROVIDER` | `swa` |
| `AUTH_PRINCIPAL_HEADER` | `x-ms-client-principal` for `swa`, `x-authenticated-principal` for `header` |
| `AUTH_PRINCIPAL_ENCODING` | `base64-json` for `swa`, `json` for `header` |
| `GRAMMAR_API_URL` | `https://api.languagetool.org/v2/check` |
| `GRAMMAR_API_KEY` | unset |
| `GRAMMAR_REQUIRE_API_KEY` | `true` |
| `GRAMMAR_RATE_LIMIT_RPM` | `20` |

When `GRAMMAR_REQUIRE_API_KEY=true` and `GRAMMAR_API_KEY` is unset, Advanced grammar is disabled in Settings (with a tooltip explaining why) and the API rejects advanced grammar checks.

The GitHub Actions workflows read the GitHub variable `SANITY_SCHEMA_CONFIG` and expose it as both `VITE_SANITY_SCHEMA_CONFIG` (frontend build/test) and `SANITY_SCHEMA_CONFIG` (API test/runtime).

> [!TIP]
> `VITE_SANITY_PROJECT_ID` is typically the same across environments. `VITE_SANITY_DATASET` and `VITE_SANITY_TOKEN` should differ — use a read/write token scoped to the appropriate dataset in each environment.

## Migration checklist

Migration guidance for moving from hardcoded schema/auth assumptions to runtime-config values is maintained in issue **#147** so operators can track checklist updates in one place.

## Entra ID App Registration

The app uses Azure Static Web Apps' built-in authentication with Microsoft Entra ID. An App Registration must be created manually in the Azure portal before deploying.

### Create the App Registration

1. Go to **Microsoft Entra ID → App registrations → New registration**
2. **Name:** `Earnesty`
3. **Supported account types:** "Accounts in this organizational directory only" (single tenant)
4. **Redirect URI:** Select **Web** and enter:

   ```
   https://<your-swa-hostname>/.auth/login/aad/callback
   ```

   For local development with the SWA CLI, also add:

   ```
   http://localhost:4280/.auth/login/aad/callback
   ```

5. Click **Register**

### Enable ID tokens

Azure Static Web Apps uses the hybrid OIDC flow (`response_type=code id_token`), which requires the app to issue ID tokens.

1. In the App Registration, go to **Authentication**
2. Under **Implicit grant and hybrid flows**, check **ID tokens (used for implicit and hybrid flows)**
3. Click **Save**

> [!IMPORTANT]
> Without this setting, the SWA auth callback will return **401 Unauthorized** after a successful Entra ID login.

### Create a client secret

1. In the App Registration, go to **Certificates & secrets → Client secrets → New client secret**
2. Set a description (e.g. `SWA auth`) and expiry
3. Copy the **Value** immediately — it is only shown once

### Note the required values

| Value | Where to find it |
|-------|-----------------|
| Application (client) ID | App Registration → Overview |
| Directory (tenant) ID | App Registration → Overview |
| Client secret value | Copied in the previous step |

### Configure SWA app settings

App settings are managed automatically by the Bicep infrastructure deployment. Supply them as GitHub secrets in the `production` environment (see [Secrets and variables](#secrets-and-variables) below):

| GitHub Secret | SWA App Setting | Description |
|---------------|-----------------|-------------|
| `ENTRA_CLIENT_ID` | `AZURE_CLIENT_ID` | Application (client) ID from the App Registration |
| `ENTRA_CLIENT_SECRET` | `AZURE_CLIENT_SECRET` | Client secret value |
| `ENTRA_TENANT_ID` | `AZURE_TENANT_ID` | Directory (tenant) ID — used in the OpenID Connect issuer URL |

> [!NOTE]
> The `ENTRA_*` secret names are distinct from the `AZURE_CLIENT_ID` / `AZURE_TENANT_ID` repository-level secrets used for OIDC infrastructure deployment.

### Infrastructure secrets (repository level)

The infrastructure deployment workflow (`deploy-infra.yml`) uses Azure OIDC (workload identity federation) — no client secret is stored in GitHub. Instead, GitHub's OIDC token is exchanged for an Azure access token at runtime.

These repository-level secrets identify which service principal to authenticate as:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Client ID of the app registration used for infrastructure deployment |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

#### Required Azure RBAC permissions

The service principal (app registration) used for infrastructure deployment must be granted **Contributor** on the target subscription. This allows it to create and manage resource groups and all resources within them.

```bash
az role assignment create \
  --assignee "<app-registration-client-id>" \
  --role "Contributor" \
  --scope "/subscriptions/<subscription-id>"
```

> [!NOTE]
> **Contributor** is sufficient for creating resource groups, deploying the Static Web App, and writing app settings. You do not need **Owner** unless you plan to assign Azure RBAC roles as part of the deployment.

#### Setting up workload identity federation

On the app registration, add a federated credential to trust GitHub Actions tokens from this repository:

1. Go to **App registration → Certificates & secrets → Federated credentials → Add credential**
2. Select **GitHub Actions deploying Azure resources**
3. Set the following:
   - **Organisation:** your GitHub organisation or username
   - **Repository:** your fork of this repository
   - **Entity type:** `Environment`
   - **GitHub environment name:** `production`
4. Click **Add**
