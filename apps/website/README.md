# Website

Static marketing site for Qwery. Built with Vite and React; docs are built with Astro and Starlight.

## Development

```bash
pnpm dev
```

Runs the main site at http://localhost:5000.

To run the docs (Starlight) dev server:

```bash
pnpm dev:docs
```

Runs the docs at http://localhost:5001.

## Build

```bash
pnpm build
```

Builds the main site to `dist/` and the docs to `dist/docs/`. Deploy the whole `dist/` folder to any static host (e.g. GitHub Pages, Netlify, Cloudflare Pages). The Docs link points to `/docs/` (Starlight).
