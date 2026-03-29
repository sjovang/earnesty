The purpose of this application is to provide a clean and minimal user interface for focused writing.

Content is stored in a Sanity.io project, which allows for flexible content management and easy integration with the frontend. The application is designed to be responsive and accessible, ensuring that users can write comfortably on any device.

We are creating a single-page application (SPA) using Aspire.dev, which allows for a seamless user experience without page reloads. The frontend will be built using Vue, and we will utilize Sanity's APIs to fetch and manage content.

We use catppuccin for colors. The app have a light theme using catppuccin's latte palette, and a dark theme using catppuccin's macchiato palette. The user can switch between themes in the settings.

User settings are stored in the browser's local storage, allowing for a personalized experience without the need for user accounts. Users can customize their writing environment, including font size, line spacing, and theme preferences.

## Branching

All work is done in feature branches and merged into `main` through a pull request. Branch names should follow the pattern `feature/<short-description>`. Direct commits to `main` are not allowed.

## Commits

All commits must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This is required for release-please to automatically determine version bumps and generate changelogs.

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

- `feat:` triggers a **minor** version bump
- `fix:` triggers a **patch** version bump
- `feat!:` or any type with `BREAKING CHANGE:` in the footer triggers a **major** version bump
- All other types (`chore:`, `ci:`, `docs:`, etc.) do not trigger a release

Always include the `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>` trailer in every commit.
