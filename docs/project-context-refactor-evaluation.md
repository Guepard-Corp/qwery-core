# ProjectProvider Refactor Evaluation

**Scope:** `apps/web/lib/context/project-context.tsx`  
**Baseline:** Commit before refactor (`git show HEAD:apps/web/lib/context/project-context.tsx`). Original implementation supported only `/prj/`, `/c/`, `/notebook/`; no `/ds/` support.  
**Refactor:** Adds `/ds/:slug` support and centralizes slug resolution.

**Implemented follow-ups (post-evaluation):**

- `useGetProjectBySlug` accepts `options?: { enabled?: boolean }` and defaults to `enabled: !!slug` when options are omitted; provider passes `{ enabled: !!slug }`.
- `pathsUsingStored` renamed to `routesUsingStoredSlug`.
- Stored slug is read via `useSyncExternalStore` in a `useStoredSlug(active)` hook so localStorage reads are behind a hook.

---

## 1. Single Responsibility & Separation of Concerns

**Verdict: PASS**

| Responsibility | Implementation | Notes |
|----------------|----------------|-------|
| **Slug resolution** | `slugFromPath`, `slugFromDsPath`, `resolveSlug`, `getStoredSlug` (L40–60) | Pure helpers; no hooks, no routing, no async. |
| **Project fetching** | `useGetDatasourceBySlug`, `useGetProjectById`, `useGetProjectBySlug` (L74–99) | Route-specific `enabled` on datasource/project-by-id. |
| **Context value shaping** | `project`, `isLoading` derivation (L101–108) and `useMemo` value (L116–125) | Combines DS vs slug-based project and loading. |
| **Persistence** | `setStoredSlug` in `useEffect` (L110–114) | Side-effect isolated in one effect. |

**Helper purity:**  
`getStoredSlug`, `setStoredSlug` guard `window`; `slugFromPath`/`slugFromDsPath`/`resolveSlug` are pure, hook-free, and side-effect free.  
**Mixed concern:** None. Slug derivation, queries, and context value are in separate steps.

---

## 2. Readability & Naming

**Verdict: PASS** (with minor naming notes)

**Slug derivation (in order):**

1. `pathname` (from `useLocation()`)
2. `pathSlug` = `slugFromPath(pathname)` → `/prj/:slug`
3. `dsSlug` = `slugFromDsPath(pathname)` → `/ds/:slug`
4. `isDsRoute`, `routesUsingStoredSlug` (booleans from pathname)
5. `storedSlug` = `useStoredSlug(routesUsingStoredSlug)` (via `useSyncExternalStore`)
6. `slug` = `resolveSlug(pathSlug, projectFromDs.data?.slug, storedSlug, routesUsingStoredSlug)`

Flow is linear: path → pathSlug/dsSlug → storedSlug → resolved `slug`.  
**Naming clarity:**  
- `pathSlug` vs `dsSlug` vs `slug`: clear (path-only, DS-segment, final resolved).  
- `projectFromDs` = project from datasource’s `projectId`; `projectBySlug` = project from resolved slug; intent is clear.  
- `routesUsingStoredSlug`: routes that may use the stored slug (`/c/`, `/notebook/`, `/ds/`).

---

## 3. Correctness vs Previous Behavior

**Verdict: PASS** for extended behavior; **intentional change** vs original.

**Original (HEAD):**  
- Routes: `/prj/:slug`, `/c/*`, `/notebook/*`  
- Slug: `slugFromUrl` (from `/prj/`) or stored when on `/c/` or `/notebook/`  
- No `/ds/` support.

**Refactor behavior:**

| Route | pathSlug | dsSlug | routesUsingStoredSlug | slug source | project source |
|-------|----------|--------|------------------------|-------------|----------------|
| `/prj/foo` | `foo` | null | false | pathSlug | projectBySlug |
| `/ds/bar` | null | `bar` | true | projectFromDs.slug (after DS load) or stored | projectFromDs when loaded |
| `/c/baz` | null | null | true | storedSlug | projectBySlug |
| `/notebook/qux` | null | null | true | storedSlug | projectBySlug |

- **`/prj/foo`:** slug=foo, project from `useGetProjectBySlug` — same idea as before; storage still updated from pathSlug.  
- **`/ds/bar`:** New. Slug comes from DS’s project; project from `useGetProjectById(datasource.projectId)`; storage updated from `projectFromDs.data?.slug` when on DS route.  
- **`/c/baz`,** **`/notebook/qux`:** slug from stored, project from slug — matches original.

**Persistence:**  
Original stored only when `slugFromUrl` (i.e. on `/prj/`). Refactor also stores when `isDsRoute && projectFromDs.data?.slug`. So “last project” now includes DS-driven project — intended.

**Conclusion:** No regressions on `/prj/`, `/c/`, `/notebook/`; `/ds/` is correctly added with consistent slug/project and storage behavior.

---

## 4. Hooks & Dependency Correctness

**Verdict: PASS** (one optional hardening)

**Hooks and dependencies:**

| Hook | Deps | Used in body? | Why re-run? |
|------|------|----------------|-------------|
| `useMemo(() => slugFromPath(pathname), [pathname])` | `[pathname]` | pathname | pathSlug must track pathname. |
| `useMemo(() => slugFromDsPath(pathname), [pathname])` | `[pathname]` | pathname | dsSlug must track pathname. |
| `useGetDatasourceBySlug(..., { enabled: isDsRoute && !!dsSlug })` | — | — | N/A (hook deps internal). |
| `useGetProjectById(..., datasource.data?.projectId ?? '')` | — | — | N/A. `enabled: !!id` in hook. |
| `useStoredSlug(routesUsingStoredSlug)` | — | — | `useSyncExternalStore`; reads localStorage only when active. |
| `useMemo(resolveSlug(...), [pathSlug, projectFromDs.data?.slug, storedSlug, routesUsingStoredSlug])` | All four | All four | slug must update when any source changes. |
| `useGetProjectBySlug(..., slug ?? '', { enabled: !!slug })` | — | — | N/A. Query disabled when slug empty. |
| `useEffect(() => { setStoredSlug(...) }, [pathSlug, isDsRoute, projectFromDs.data?.slug])` | All three | All three | Storage must update when path-slug or DS project slug changes. |
| `useMemo(() => ({ project, projectId, ... }), [project, slug, isLoading])` | project, slug, isLoading | All three | Value must track context output. |

**StoredSlug:** Implemented via `useStoredSlug(routesUsingStoredSlug)` using `useSyncExternalStore`, so localStorage is read only inside a hook and only when `routesUsingStoredSlug` is true.

---

## 5. Performance & Unnecessary Work

**Verdict: PASS** (one improvement possible)

- **Datasource:** `useGetDatasourceBySlug(..., { enabled: isDsRoute && !!dsSlug })` — runs only on `/ds/:slug`.  
- **Project by id:** `useGetProjectById(..., datasource.data?.projectId ?? '')` has `enabled: !!id` inside the hook — so when not on DS or before DS loads, `id === ''` and the query is disabled.  
- **Project by slug:** `useGetProjectBySlug(repositories.project, slug ?? '', { enabled: !!slug })` — **implemented.** Query is disabled when slug is empty.

**When pathname is `/prj/foo`:**  
- Datasource disabled.  
- Project-by-id disabled (no projectId).  
- Project-by-slug runs with `foo` (`enabled: true`).  

**When pathname is `/ds/bar`:**  
- Datasource runs.  
- Project-by-id runs when `datasource.data?.projectId` is set.  
- Project-by-slug runs only when resolved slug is non-empty (`enabled: !!slug`).

**Context value:** `useMemo(..., [project, slug, isLoading])` — value is stable when those three are unchanged. PASS.

---

## 6. Edge Cases & Safety

**Verdict: PASS**

| Scenario | pathname / context | pathSlug | dsSlug | slug | project | Risk |
|----------|--------------------|----------|--------|------|--------|------|
| Empty pathname | `''` | null | null | null (pathsUsingStored false → no stored) or stored if we considered '' as “c/” etc. | — | Actually `pathsUsingStored` is false; slug=null; project=projectBySlug.data??null. No crash. |
| `/ds/` (no slug) | `/ds/` | null | null (regex `/\/ds\/([^/]+)/` no match) | null | null | No crash. |
| `/ds/abc` (no DS in backend) | `/ds/abc` | null | `abc` | from projectFromDs.slug (undefined) or stored | projectFromDs.data ?? null → null | datasource.data undefined; projectFromDs disabled (id ''); slug can fall back to stored. Safe. |
| `/prj/` (no slug) | `/prj/` | null (regex needs segment) | null | null | null | No crash. |
| SSR (no window) | any | — | — | getStoredSlug() and setStoredSlug() guard `typeof window === 'undefined'` | — | No localStorage access on server. |

**Type consistency:** `ProjectContextValue` uses `Project | null`, `string | undefined` for ids/slugs; `useProjectOptional()` returns `ProjectContextValue | null`. All usages (e.g. `projectContext?.projectId`, `projectContext?.projectSlug`) are consistent with that.

**Conclusion:** No crashes or unsafe access identified; SSR is guarded.

---

## 7. API Surface: `useProject` vs `useProjectOptional`

**Verdict: PASS**

- **`useProject`:** Throws `'useProject must be used within a ProjectProvider'` when context is null; return type is `ProjectContextValue`. Correct for “must have provider” usage.

- **`useProjectOptional` usages:**
  1. **`project-chat-notebook-sidebar-content.tsx`:** Uses `projectContext?.projectId`, `projectContext?.projectSlug`, `projectContext?.isLoading` and passes `projectId` into queries/mutations that already support undefined (e.g. `enabled: !!projectId`). Component can render without a project (e.g. before slug is resolved or on routes without project). **Correct to use optional.**
  2. **`project-paused-overlay.tsx`:** `if (!context) return null;` then uses `project`, `isLoading`. Overlay is optional and only shown when context exists and project is paused. **Correct to use optional.**

**Placement:** Both components live under `ProjectSidebar` / project layout, which is inside `ProjectProvider` (see `layout.tsx` L246–254). So in practice context is always present when those components mount. Using `useProjectOptional` is still valid: it encodes “this component can render without project data” (e.g. loading or no slug), which matches the UI (empty state, no overlay, etc.). Switching to `useProject` would force either a non-null assertion or restructuring; current choice is reasonable.

---

## Summary Table

| # | Category | Verdict | Main point |
|---|-----------|---------|------------|
| 1 | Single responsibility & separation of concerns | PASS | Slug resolution, fetching, and context value are separated; helpers are pure and side-effect-free where intended. |
| 2 | Readability & naming | PASS | Slug flow is clear; naming is consistent (pathSlug / dsSlug / slug, projectFromDs / projectBySlug). |
| 3 | Correctness vs previous behavior | PASS | Same behavior on `/prj/`, `/c/`, `/notebook/`; `/ds/` and DS-based storage added correctly. |
| 4 | Hooks & dependency correctness | PASS | No conditional hooks; deps match usage; storedSlug read via `useStoredSlug` (useSyncExternalStore). |
| 5 | Performance & unnecessary work | PASS | Route-specific `enabled` on datasource, project-by-id, and project-by-slug (`enabled: !!slug`). |
| 6 | Edge cases & SSR | PASS | Empty/malformed pathnames and SSR are handled; no unsafe access. |
| 7 | useProject vs useProjectOptional | PASS | Both hooks used appropriately; optional used where “no project” is valid. |

---

## Recommended Follow-ups

1. **Tests:** Add unit tests for `resolveSlug`, `slugFromPath`, and `slugFromDsPath` for the main pathname patterns and edge cases above.
