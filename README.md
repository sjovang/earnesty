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
   VITE_SANITY_TOKEN=your_sanity_token
   ```

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

> [!TIP]
> `VITE_SANITY_PROJECT_ID` is typically the same across environments. `VITE_SANITY_DATASET` and `VITE_SANITY_TOKEN` should differ — use a read/write token scoped to the appropriate dataset in each environment.

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
> The `AZURE_TENANT_ID` app setting is required because `staticwebapp.config.json` references `{AZURE_TENANT_ID}` in the `openIdIssuer` URL. SWA resolves this at runtime from app settings.
>
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

