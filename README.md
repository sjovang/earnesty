# Ernesty

A minimal, focused writing environment built with [Vue 3](https://vuejs.org) and a [Sanity.io](https://sanity.io) backend, orchestrated by [.NET Aspire](https://aspire.dev).

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org) with npm

## Setup

1. **Install frontend dependencies**

   ```sh
   cd frontend && npm install
   ```

2. **Trust the HTTPS dev certificate** *(first time only)*

   ```sh
   dotnet dev-certs https --trust
   ```

   This adds the ASP.NET Core dev certificate to your system keychain so the Aspire dashboard opens without browser security warnings. You will be prompted for your password on macOS.

3. **Configure environment variables**

   ```sh
   cp frontend/.env.example frontend/.env
   ```

   Edit `frontend/.env` and set your Sanity project ID:

   ```env
   VITE_SANITY_PROJECT_ID=your_project_id
   VITE_SANITY_DATASET=Development
   ```

## Running locally

Start the full stack through the Aspire AppHost — this launches the Vue dev server and opens the Aspire dashboard:

```sh
dotnet run --project Ernesty.AppHost
```

The Aspire dashboard will show all running resources and their URLs. The Vue frontend is available at the URL shown for the `frontend` resource (typically <http://localhost:5173>).

### Frontend only (without Aspire)

```sh
cd frontend && npm run dev
```

## Building for production

```sh
cd frontend && npm run build
```

Output is written to `frontend/dist/`.