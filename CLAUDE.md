# AGENTS.md

This AGENTS.md file provides comprehensive guidance for OpenAI Codex and other AI agents working with this codebase.

### Core Technologies

- **React Router 7** in SSR/Framework mode
- **React 19**
- **TypeScript**
- **Tailwind CSS 4** and Shadcn UI
- **Turborepo**

## Monorepo Structure

- `apps/web` - Main React Router SaaS application
- `apps/e2e` - Playwright end-to-end tests
- `packages/features/*` - Feature packages
- `packages/` - Shared packages and utilities
- `tooling/` - Build tools and development scripts

## Essential Commands

### Development Workflow

```bash
pnpm dev                    # Start all apps
pnpm --filter web dev       # Main app (port 3000)
```

### Code Quality

```bash
pnpm format:fix
pnpm lint:fix
pnpm typecheck
```

- Run the typecheck command regularly to ensure your code is type-safe.
- Run the linter and the formatter when your task is complete.

## Typescript

- Write clean, clear, well-designed, explicit TypeScript
- Avoid obvious comments
- Avoid unnecessary complexity or overly abstract code
- Always use implicit type inference, unless impossible
- You must avoid using `any`
- Handle errors gracefully using try/catch and appropriate error types

## React

- Use functional components
- Add `data-test` for E2E tests where appropriate
- `useEffect` is a code smell and must be justified - avoid if possible
- Do not write many separate `useState`, prefer single state object (unless required)
