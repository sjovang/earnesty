The purpose of this application is to provide a clean and minimal user interface for focused writing.

Content is stored in a Sanity.io project, which allows for flexible content management and easy integration with the frontend. The application is designed to be responsive and accessible, ensuring that users can write comfortably on any device.

This is a single-page application (SPA) built with Vue 3 and Vite, using Sanity's APIs to fetch and manage content.

We use catppuccin for colors. The app have a light theme using catppuccin's latte palette, and a dark theme using catppuccin's macchiato palette. The user can switch between themes in the settings.

User settings are stored in the browser's local storage, allowing for a personalized experience without the need for user accounts. Users can customize their writing environment, including font size, line spacing, and theme preferences.

## Branching

All work is done in feature branches and merged into `main` through a pull request. Branch names should follow the pattern `feature/<short-description>`. Direct commits to `main` are not allowed.

Pull requests must not be merged until all CI checks pass and all tests (unit and integration) are green. Pull requests are always created as drafts.

Copilot is allowed to:
- Review pull requests and leave comments
- Convert a pull request from draft to ready for review
- Approve and merge pull requests when explicitly instructed to do so

The repository owner must review and approve pull requests before merging unless Copilot is explicitly instructed to handle the approval and merge.

## Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is required for release-please to automatically determine version bumps and generate changelogs.

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

- `feat:` triggers a **minor** version bump
- `fix:` triggers a **patch** version bump
- `feat!:` or any type with `BREAKING CHANGE:` in the footer triggers a **major** version bump
- All other types (`chore:`, `ci:`, `docs:`, etc.) do not trigger a release

Always include the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer in every commit.

## Session startup

At the start of every session, start the local dev server in the background if it is not already running:

```sh
cd app && npm run dev &
```

The dev server runs at http://localhost:5173. `strictPort: false` means it may use a different port if 5173 is taken — check the output to confirm the URL.

## Testing

Tests are written with [Vitest](https://vitest.dev/) and live alongside the source they test in `__tests__/` subdirectories.

- **API** (`app/api/`) — node environment; run with `npm test` inside `app/api/`
- **Frontend** (`app/`) — jsdom environment; run with `npm test` inside `app/`

Test files are excluded from the TypeScript build (`tsc`) via `tsconfig.json` and are never compiled to `dist/`.

Each Azure Function handler is tested by mocking `@azure/functions` (to capture the registered handler) and `../shared.js` (to inject a mock Sanity client and principal). Frontend service tests mock `@sanity/client` directly. Use `vi.hoisted()` when a variable must be accessible inside a `vi.mock()` factory.

### Integration tests

Integration tests (files ending in `*.integration.test.ts`) run against the real Sanity development dataset — no mocks. They require environment variables to be set and skip gracefully when they are not:

| Variable | Required by |
|---|---|
| `SANITY_PROJECT_ID` | API integration tests |
| `SANITY_TOKEN` | API integration tests + frontend test setup/teardown |
| `SANITY_DATASET` | API integration tests |
| `VITE_SANITY_PROJECT_ID` | Frontend integration tests |
| `VITE_SANITY_DATASET` | Frontend integration tests |

Run with:

```sh
cd app/api && npm run test:integration
cd app && npm run test:integration
```

Integration tests use a unique timestamp-based document ID per run and always clean up in `afterAll`, even on failure.

In GitHub Actions, integration tests run in the `test-integration` job under the `dev` environment, which holds the Sanity development dataset credentials. The `build` job depends on this job passing.

Run the full test suite before committing whenever business logic or Sanity interactions are changed:

```sh
cd app/api && npm test
cd app && npm test
```

## Pre-commit checks

Before every `git commit`, run pre-commit checks manually and fix any failures before proceeding:

```sh
pre-commit run
```

If checks fail, fix all reported errors and warnings, then re-run until they pass. Never commit with failing checks or use `--no-verify` to bypass them.
