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

## Troubleshooting

**`EPERM: operation not permitted, read`** – Caused by Bun reading stdin (terminal input). Known regression in Bun 1.3.2+ for interactive/TUI apps. Workarounds:

- Ensure the TUI runs in a real TTY (not a pipe or restricted terminal)
- Ensure that Bun 1.3.0 is installed to avoid this read permission issue, and run `bun run dev` with watch if needed.

(Note: `pnpm start` uses Node; @opentui/core loads `.scm` assets that Node does not support, so the TUI is intended to be run with Bun for dev.)

## Debug logging

With `dev` or `dev:debug`, `QWERY_TUI_DEBUG_LOG` is set so all actions and key steps are written to `tui-debug.log` in the package directory. From repo root:

```bash
tail -f apps/tui/tui-debug.log
```

Log lines are timestamped and include `ACTION` (every dispatch), `LOG`/`WARN`/`ERROR` (notebook cell run and other steps).

## Development

- `pnpm format:fix` / `pnpm format` – Prettier
- `pnpm lint` – ESLint
- `pnpm typecheck` – TypeScript
- `pnpm test` – Vitest

Agent responses are mocked (2s delay). Mesh status shows placeholder `servers: -, workers: -, jobs: -` until qwery-core has an equivalent API.
