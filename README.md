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
| `dev` | PR build job (`frontend.yml`) | Validates PRs against the dev Sanity dataset |
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
| `VITE_SANITY_PROJECT_ID` | Sanity project ID |
| `VITE_SANITY_DATASET` | Sanity dataset name (e.g. `production`) |
| `VITE_SANITY_TOKEN` | Sanity API token with read/write access |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | Deployment token from Azure Static Web Apps |

> [!TIP]
> `VITE_SANITY_PROJECT_ID` is typically the same across environments. `VITE_SANITY_DATASET` and `VITE_SANITY_TOKEN` should differ — use a read/write token scoped to the appropriate dataset in each environment.

### Infrastructure secrets (repository level)

The infrastructure deployment workflow (`deploy-infra.yml`) uses Azure OIDC (federated identity) and requires these secrets at **repository level** (not environment-scoped):

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | Azure app registration client ID |
| `AZURE_TENANT_ID` | Azure tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |

