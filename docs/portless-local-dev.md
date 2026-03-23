# Local dev with [Portless](https://port1355.dev/)

Portless serves this repo on stable **`.localhost`** URLs (port **1355** by default) instead of memorizing port numbers. Use **`portless run`** so [git worktrees](https://git-scm.com/docs/git-worktree) get a unique subdomain from the branch name—no collisions when several checkouts run at once.

## Install

Install globally (do **not** add Portless as a repo dependency):

```bash
npm install -g portless
```

Requirements: **Node.js 20+** (this repo uses Node **22+**).

## Git worktree bootstrap

A [linked worktree](https://git-scm.com/docs/git-worktree) is a separate directory with its own **`node_modules`** — treat it like a new clone after `git worktree add`:

```bash
pnpm setup:worktree
```

Runs **`pnpm install`**, copies **`apps/web/.env`** and **`apps/server/.env`** from the **primary** checkout when this worktree does not have them (set **`QWERY_SETUP_ENV_FROM=/path/to/main/repo`** to copy from a specific path), then **`pnpm setup:vscode`**. Flags: **`--skip-install`**, **`--no-env-copy`**, **`--no-vscode`**.

## One-time HTTPS (optional)

```bash
portless proxy start --https
```

After that, apps can be reached at `https://<name>.localhost` (no `:1355`). Without HTTPS, URLs use `http://<name>.localhost:1355`.

## Scripts (from repo root)

| Command | What it does |
|--------|----------------|
| `pnpm web:dev:portless` | Web app (`apps/web`, React Router / Vite) behind Portless |
| `pnpm server:dev:portless` | API server (`apps/server`) behind Portless |
| `pnpm dev:portless` | Full monorepo `turbo dev` (parallel); see [Caveats](#caveats-monorepo-dev) |
| `pnpm dev:stack:clients` | Run chosen clients in parallel (see [Clients](#client-selection)) |
| `pnpm dev:stack:clients:portless` | Same, with Portless only for **web** + default `VITE_API_URL` when web is included |
| `pnpm dev:terminals` | Two terminals: **server** · **clients** (regular stack) |
| `pnpm dev:terminals:portless` | Shortcut: same as `pnpm dev:terminals -- portless` |
| `pnpm setup:worktree` | Worktree / fresh checkout: **`pnpm install`**, copy **`.env`** from primary when missing, **`setup:vscode`** |
| `pnpm setup:vscode` | Copy **`tooling/vscode/tasks.json`** → **`.vscode/tasks.json`** (editor tasks) |

### Client selection

Valid client ids are defined once in **`scripts/lib-dev-client-args.sh`** (`QWERY_DEV_CLIENT_IDS`). Pass one or more of those names, or **`all`**, after **`--`**. Default if you omit them: **`web`** and **`tui`**.

pnpm often forwards a literal **`--`** before extra args; the scripts ignore it. You can also use **`--web`**, **`--tui`**, etc.

```bash
pnpm dev:stack:clients -- web
pnpm dev:stack:clients:portless --web
pnpm dev:stack:clients -- desktop
pnpm dev:stack:clients -- web tui desktop    # same as -- all
pnpm dev:stack:clients:portless -- web
pnpm dev:terminals -- web
pnpm dev:terminals -- portless web
pnpm dev:terminals -- portless web tui
pnpm dev:terminals:portless -- web
pnpm dev:terminals:portless -- all
```

Portless applies to **web** only; **tui** and **desktop** always use normal dev commands.

## Two terminals (server · clients)

From the repo root, **`pnpm dev:terminals`** starts **`pnpm server:dev`** in one window/tab and **`pnpm dev:stack:clients`** in another. Put **`portless`** (or **`regular`**) as the **first** argument after **`--`**, then client names — e.g. **`pnpm dev:terminals -- portless web`**. **`pnpm dev:terminals:portless`** is a shortcut that prepends **`portless`** so you can write **`pnpm dev:terminals:portless -- web`** only. Portless mode uses **`server:dev:portless`** and **`dev:stack:clients:portless`** (sets `VITE_API_URL` when **web** is in the set; override if your Portless API URL differs, e.g. in a worktree).

Requires a supported terminal on **Linux** (gnome-terminal, konsole, xfce4-terminal, kitty, alacritty, xterm) or **macOS** Terminal.app. If nothing launches, run the two commands printed in the error message manually.

## URLs

With **`pnpm web:dev:portless`** and default name `qwery`:

- **Main repo:** `http://qwery.localhost:1355` (or `https://qwery.localhost` if HTTPS proxy is on)
- **Linked worktree** (e.g. branch `fix-ui`): `http://fix-ui.qwery.localhost:1355`

Portless infers the worktree prefix automatically when you use `portless run`; `--name qwery` keeps the stable base segment. Override with `portless run --name <name> ...` if needed.

For the API server script (`server:dev:portless`), the base name is `api.qwery`. In a linked worktree you get a branch prefix (e.g. `fix-ui.api.qwery.localhost`). Confirm the exact URL with `portless list` or the CLI output when the process starts.

## Web + server (full local stack)

1. Terminal A — API:

   ```bash
   pnpm server:dev:portless
   ```

2. Terminal B — web, with the API base URL pointing at Portless (adjust scheme/port if you use HTTPS or a non-default proxy port):

   ```bash
   VITE_API_URL=http://api.qwery.localhost:1355/api pnpm web:dev:portless
   ```

   In a worktree, use the origin Portless prints for the server (see `portless list` if unsure), e.g. `http://<branch>.api.qwery.localhost:1355/api`.

See also [README](../README.md) (environment and `VITE_API_URL`).

## Caveats: monorepo `dev`

`pnpm dev:portless` runs `turbo dev --parallel`. Portless sets **`PORT`** (and injects **`--port` / `--host`** for stacks like React Router that ignore `PORT`). Multiple packages starting dev servers at once may still need distinct ports in their own config. Prefer **`web:dev:portless`** (and optionally **`server:dev:portless`**) when you only need the web app or web + API.

## Custom TLD

To use something like `.test` instead of `.localhost`:

```bash
sudo portless proxy start --https --tld test
```

The proxy can sync `/etc/hosts` for custom TLDs. Prefer **`.test`** (reserved); avoid **`.dev`** (browser HSTS) and **`.local`** (mDNS conflicts). Details: [Portless docs — Custom TLD](https://port1355.dev/).

## `dev:terminals` environment

| Variable | OS | Purpose |
|----------|-----|--------|
| `QWERY_DEV_TERMINAL` | macOS | `auto` (default): iTerm if installed under `Applications`, else Terminal.app. `iterm` / `terminal` to force one app. |
| `QWERY_DEV_TERMINAL_EMU` | Linux | Try this emulator first (e.g. `foot`, `wezterm`, `ghostty`) if supported by `scripts/open-dev-terminals.sh`; otherwise falls back to the built-in list. |
| `QWERY_DEV_TERMINAL_UI` | all | `auto` (default): inside **VS Code / Cursor** integrated terminal, `pnpm dev:terminals` **does not** spawn an external emulator; it prints which **workspace task** to run (see `.vscode/tasks.json`). `vscode` forces that behavior; `external` always opens gnome-terminal / Terminal.app / etc. |
| `QWERY_PORTLESS_API_HOST` | all | Optional override for Portless API host used by `dev:stack:clients:portless` when **web** is selected. Default is auto-computed: `api.qwery.localhost:1355` in the primary checkout, `<branch>.api.qwery.localhost:1355` in linked worktrees. |

### VS Code / Cursor integrated terminals

Bash cannot create new integrated terminal tabs from a script. The canonical task definitions live in **`tooling/vscode/tasks.json`** (tracked in git). **`.vscode/` is gitignored**, so copy them once:

```bash
pnpm setup:vscode
```

That writes **`.vscode/tasks.json`** with parallel compound tasks (server + clients, **dedicated** terminal panel each). When you run `pnpm dev:terminals` **from the editor’s integrated terminal**, the script detects it and tells you the matching task name. Run it via **Command Palette → Tasks: Run Task** (and pick e.g. **`Qwery: dev - server + clients (regular)`**). Re-run **`pnpm setup:vscode`** after pulling if tasks change. **Note:** In **Cursor**, **Ctrl+Shift+B** is often bound to something else (e.g. browser preview), not VS Code’s “Run Build Task”, so do not rely on that shortcut here.

## Troubleshooting

**502 from Portless (“target app is not responding”)** — The proxy forwards to whatever `PORT` it sets. If Vite ignored `PORT` and stayed on `3000`, nothing listens on the assigned port. This repo’s `apps/web/vite.config.ts` uses `PORT` / `HOST` when set so the dev server binds where Portless expects.

**Vite `ECONNREFUSED 127.0.0.1:4096` on `/api`** — With Portless, the API listens on a **random** port, not 4096. Dev SSR uses Vite’s `/api` proxy; `dev:stack:clients:portless` auto-sets **`VITE_DEV_API_PROXY`** to the matching Portless API host (`api.qwery.localhost:1355` or `<branch>.api.qwery.localhost:1355` in linked worktrees). Override with **`QWERY_PORTLESS_API_HOST`** when needed.

## Reference

- [port1355.dev — Getting Started](https://port1355.dev/)
- [Portless — Git worktrees](https://port1355.dev/) (branch-based subdomains with `portless run`)
