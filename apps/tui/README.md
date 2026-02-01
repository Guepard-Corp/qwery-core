# Qwery TUI

Terminal UI for Qwery, migrated from the qwery-cli Go/Bubbletea TUI. Built with OpenTUI + React and TypeScript.

## Screens

- **Home**: Logo, prompt input with mode (Query / Ask), shortcuts, tip, status bar (mesh: servers/workers/jobs).
- **Chat**: Title bar, message list (user/assistant), loader when busy, input, status bar.
- **Command palette** (Ctrl+P): Search, categorized commands (New conversation, Switch conversation, Help).

## Key bindings

- **Global**: `Ctrl+C` / `q` quit; `Ctrl+P` command palette.
- **Home**: `Tab` / `Shift+Tab` / `Left` / `Right` change mode; `Backspace` / type / `Enter` submit.
- **Chat**: `Escape` back to home (or cancel if busy); `Backspace` / type / `Enter` send.
- **Command palette**: `Up` / `Down` / `Enter` select; `Backspace` / type to filter; `Escape` / `Ctrl+P` close.

## Run

From repo root:

```bash
pnpm --filter @qwery/tui dev
```

Or with Bun:

```bash
cd apps/tui && bun run dev
```

Build and run built output:

```bash
pnpm --filter @qwery/tui build
pnpm --filter @qwery/tui start
```

## Development

- `pnpm format:fix` / `pnpm format` – Prettier
- `pnpm lint` – ESLint
- `pnpm typecheck` – TypeScript
- `pnpm test` – Vitest

Agent responses are mocked (2s delay). Mesh status shows placeholder `servers: -, workers: -, jobs: -` until qwery-core has an equivalent API.
