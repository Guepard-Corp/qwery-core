# Desktop App Workflow

This project now ships with an Electron shell located in `apps/desktop`. The shell wraps the existing `apps/web` React Router application so the desktop build always mirrors the web UX.

## File layout

- `apps/desktop/electron/main.ts` – Electron main-process bootstrap, window lifecycle, deep links, IPC surface
- `apps/desktop/electron/preload.ts` – secure bridge that exposes a minimal API (`window.desktop`)
- `apps/desktop/scripts/prepare-renderer.mjs` – copies the web build output into `apps/desktop/dist/renderer`
- `apps/desktop/electron-builder.yml` – packaging targets for macOS, Windows and Linux

## Development

```bash
pnpm install
pnpm desktop:dev
```

`desktop:dev` runs three processes in parallel:

- TypeScript watch compiler that emits `apps/desktop/dist`
- Electron + nodemon bound to the compiled main process
- `pnpm --filter web dev` serving `http://127.0.0.1:3000`

Environment knobs:

- `ELECTRON_RENDERER_URL` – override the dev URL if the web app runs on a different port
- `ELECTRON_OPEN_DEVTOOLS=false` – keep DevTools closed even in development

## Build & packaging

```bash
# compile `apps/web` and the Electron main process
pnpm desktop:build

# package installers using electron-builder
pnpm desktop:package
```

`desktop:build` performs the following steps:

1. Cleans `apps/desktop/dist` and prior release artifacts
2. Runs `pnpm --filter web build` (React Router SSR build)
3. Compiles the Electron main/preload scripts via `tsc`
4. Copies the `apps/web/build/client` bundle into `apps/desktop/dist/renderer`

`desktop:package` executes the build workflow and then calls `electron-builder` using `apps/desktop/electron-builder.yml`. Installers land in `apps/desktop/release`.

## Renderer integration

The preload script exposes a typed API accessible from the renderer:

```ts
import { getDesktopApi, isDesktopApp } from "@qwery/shared/desktop";

if (isDesktopApp()) {
  const version = await getDesktopApi()?.getAppVersion();
  console.info("Desktop version", version);
}
```

Add renderer-only behaviour behind `isDesktopApp()` checks to keep parity with the browser build.
