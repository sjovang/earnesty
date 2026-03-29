The purpose of this application is to provide a clean and minimal user interface for focused writing.

Content is stored in a Sanity.io project, which allows for flexible content management and easy integration with the frontend. The application is designed to be responsive and accessible, ensuring that users can write comfortably on any device.

This is a single-page application (SPA) built with Vue 3 and Vite, using Sanity's APIs to fetch and manage content.

We use catppuccin for colors. The app have a light theme using catppuccin's latte palette, and a dark theme using catppuccin's macchiato palette. The user can switch between themes in the settings.

User settings are stored in the browser's local storage, allowing for a personalized experience without the need for user accounts. Users can customize their writing environment, including font size, line spacing, and theme preferences.

## Branching

All work is done in feature branches and merged into `main` through a pull request. Branch names should follow the pattern `feature/<short-description>`. Direct commits to `main` are not allowed.

Pull requests must not be merged until all CI checks pass. Pull requests are always created as drafts and must be reviewed and approved by the repository owner before merging — Copilot will not approve or merge them.

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
cd frontend && npm run dev &
```

The dev server runs at http://localhost:5173. Use `strictPort: false` means it may use a different port if 5173 is taken — check the output to confirm the URL.
