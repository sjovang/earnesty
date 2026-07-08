# Earnesty

A minimal, focused writing environment built with [Vue 3](https://vuejs.org) and a [Sanity.io](https://sanity.io) backend.

> [!IMPORTANT]
> I treat this "app" as a vibe coding experiment to try out all kinds of weird stuff. There is zero effort on quality assurance =)

## Prerequisites

- [Node.js 22+](https://nodejs.org) with npm
- [pre-commit](https://pre-commit.com) (optional, for local git hooks)

## Local development

1. **Install dependencies**

   ```sh
   cd app && npm install
   ```

2. **Configure environment variables**

   ```sh
   cp app/.env.example app/.env
   ```

   Edit `app/.env`:

   ```env
   VITE_SANITY_PROJECT_ID=your_project_id
   VITE_SANITY_DATASET=dev
   VITE_SANITY_DOCUMENT_TYPE=blog
   VITE_SANITY_TITLE_FIELD=title
   VITE_SANITY_BODY_FIELD=body
   VITE_SANITY_SLUG_FIELD=slug
   VITE_SANITY_PUBLISHED_AT_FIELD=publishedAt
   # Optional: JSON multi-type schema config (overrides the single-type vars above)
   # VITE_SANITY_SCHEMA_CONFIG={"defaultType":"blog","types":[{"name":"blog","label":"Blog","titleField":"title","bodyField":"body","slugField":"slug","publishedAtField":"publishedAt","metadataFields":[{"key":"title","label":"Title","field":"title","type":"string","required":true},{"key":"slug","label":"Slug","field":"slug","type":"slug","required":true},{"key":"publishedAt","label":"Published at","field":"publishedAt","type":"datetime"},{"key":"tags","label":"Tags","field":"tags","type":"stringArray"}]}]}
   VITE_SANITY_DRAFT_PREFIX=drafts.
   VITE_AUTH_PROVIDER=swa
   VITE_AUTH_CURRENT_USER_PATH=/.auth/me
   VITE_AUTH_LOGIN_PATH=/.auth/login/aad
   VITE_AUTH_LOGOUT_PATH=/.auth/logout
   VITE_AUTH_POST_LOGIN_REDIRECT_PARAM=post_login_redirect_uri
   VITE_APP_NAME=Earnesty
   VITE_APP_INTRO_TITLE=Earnesty is your space for focused writing
   ```

   `SANITY_TOKEN` remains server-side only and must not be added as a `VITE_` variable.

3. **Start the dev server**

   ```sh
   cd app && npm run dev
   ```

   The app is available at <http://localhost:5173>.

4. **(Optional) Install pre-commit hooks**

   ```sh
   pre-commit install
   ```

   This runs ESLint and type-check automatically before every commit.

## Runtime configuration contract

The app and API expose a typed runtime configuration contract so deployments can customize branding, schema mapping, and auth endpoints without code changes.

### Frontend (`VITE_*`)

| Variable | Required | Default |
|---|---|---|
| `VITE_SANITY_PROJECT_ID` | Yes | — |
| `VITE_SANITY_DATASET` | No | `production` |
| `VITE_SANITY_DOCUMENT_TYPE` | No | `blog` |
| `VITE_SANITY_TITLE_FIELD` | No | `title` |
| `VITE_SANITY_BODY_FIELD` | No | `body` |
| `VITE_SANITY_SLUG_FIELD` | No | `slug` |
| `VITE_SANITY_PUBLISHED_AT_FIELD` | No | `publishedAt` |
| `VITE_SANITY_SCHEMA_CONFIG` | No | unset (falls back to single-type mapping variables) |
| `VITE_SANITY_DRAFT_PREFIX` | No | `drafts.` |
| `VITE_AUTH_PROVIDER` | No | `swa` |
| `VITE_AUTH_CURRENT_USER_PATH` | No | `/.auth/me` for `swa`, `/api/me` for `api` |
| `VITE_AUTH_LOGIN_PATH` | No | `/.auth/login/aad` |
| `VITE_AUTH_LOGOUT_PATH` | No | `/.auth/logout` |
| `VITE_AUTH_POST_LOGIN_REDIRECT_PARAM` | No | `post_login_redirect_uri` |
| `VITE_APP_NAME` | No | `Earnesty` |
| `VITE_APP_INTRO_TITLE` | No | `${VITE_APP_NAME} is your space for focused writing` |
| `VITE_APPLICATIONINSIGHTS_CONNECTION_STRING` | No | unset |

### API runtime settings

| Variable | Required | Default |
|---|---|---|
| `SANITY_PROJECT_ID` | Yes | — |
| `SANITY_TOKEN` | Yes | — |
| `SANITY_DATASET` | No | `production` |
| `SANITY_API_VERSION` | No | `2024-01-01` |
| `SANITY_DOCUMENT_TYPE` | No | `blog` |
| `SANITY_TITLE_FIELD` | No | `title` |
| `SANITY_BODY_FIELD` | No | `body` |
| `SANITY_SLUG_FIELD` | No | `slug` |
| `SANITY_PUBLISHED_AT_FIELD` | No | `publishedAt` |
| `SANITY_SCHEMA_CONFIG` | No | unset (falls back to single-type mapping variables) |
| `SANITY_DRAFT_PREFIX` | No | `drafts.` |
| `AUTH_PROVIDER` | No | `swa` |
| `AUTH_PRINCIPAL_HEADER` | No | `x-ms-client-principal` for `swa`, `x-authenticated-principal` for `header` |
| `AUTH_PRINCIPAL_ENCODING` | No | `base64-json` for `swa`, `json` for `header` |

Validation is fail-fast: missing required variables or invalid values (for example malformed field names or draft prefix without a trailing dot) throw explicit startup/runtime errors.

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

Configure the following secrets on **each environment** (not at repository level):

#### `dev` environment

| Secret | Description |
|--------|-------------|
| `VITE_SANITY_PROJECT_ID` | Sanity project ID |
| `VITE_SANITY_DATASET` | Sanity dataset name (e.g. `dev`) |
| `VITE_SANITY_TOKEN` | Sanity API token with read/write access |

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

Optional runtime overrides are supported for reusable deployments. Configure these as **Azure Static Web App application settings** if you need non-default schema/auth mapping:

| Optional SWA App Setting | Default |
|---|---|
| `SANITY_DOCUMENT_TYPE` | `blog` |
| `SANITY_TITLE_FIELD` | `title` |
| `SANITY_BODY_FIELD` | `body` |
| `SANITY_SLUG_FIELD` | `slug` |
| `SANITY_PUBLISHED_AT_FIELD` | `publishedAt` |
| `SANITY_SCHEMA_CONFIG` | unset (falls back to single-type mapping variables) |
| `SANITY_DRAFT_PREFIX` | `drafts.` |
| `AUTH_PROVIDER` | `swa` |
| `AUTH_PRINCIPAL_HEADER` | `x-ms-client-principal` for `swa`, `x-authenticated-principal` for `header` |
| `AUTH_PRINCIPAL_ENCODING` | `base64-json` for `swa`, `json` for `header` |

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

App settings are managed automatically by the Bicep infrastructure deployment. Supply them as GitHub secrets in the `production` environment (see [GitHub secrets](#github-secrets) below):

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
