# React Query Hooks — API Design & Usage Feedback

**Scope:** `apps/web/lib/queries/*` and their use in `project-context.tsx` and related routes.

---

## 1. `enabled` semantics — inconsistent when options are passed

**Issue:** When a hook accepts `options?: { enabled?: boolean }`, the rule for combining `enabled` with an empty identifier (slug/id) is not uniform.

| Hook | Pattern | When `options.enabled === true` and param is `''` |
|------|---------|--------------------------------------------------|
| `useGetProjectBySlug` | `options.enabled && !!slug` | Disabled (safe) |
| `useGetDatasourceBySlug` | `options.enabled && !!slug` | Disabled (safe) |
| `useGetNotebook`, `useGetNotebookById` | `options.enabled && !!slug` / `!!id` | Disabled (safe) |
| `useGetDatasourceMetadata` | `options.enabled && !!datasource` | Disabled (safe) |
| **`useGetDatasourcesByProjectId`** | `options.enabled` only | **Runs** (queryKey/queryFn use `projectId || ''`) |
| **`useGetMessagesByConversationSlug`** | `options?.enabled ?? !!slug` | **Runs** if `enabled: true` and slug is `''` |

**Recommendation:** Use one rule everywhere: **“when options are passed, still require a non-empty identifier.”**

- **useGetDatasourcesByProjectId** (`use-get-datasources.ts` L31):

  ```ts
  // Current
  enabled: options?.enabled !== undefined ? options.enabled : !!projectId,

  // Prefer
  enabled: options?.enabled !== undefined ? options.enabled && !!projectId : !!projectId,
  ```

- **useGetMessagesByConversationSlug** (`use-get-messages.ts` L29):

  ```ts
  // Current
  enabled: options?.enabled ?? !!slug,

  // Prefer (and align with others)
  enabled: options?.enabled !== undefined ? options.enabled && !!slug : !!slug,
  ```

---

## 2. Hooks without `options` — asymmetry vs rest of API

**Issue:** Some “get by id/slug” hooks have no third argument, so callers cannot override `enabled` or add options later without a breaking change.

| Hook | Has `options?` | Used where |
|------|----------------|------------|
| `useGetProjectById` | No | project-context, notebook.tsx, index.tsx |
| `useGetProjectBySlug` | Yes | project-context, welcome, notebooks/index, list-playgrounds, conversation/index |
| `useGetDatasourceBySlug` | Yes | project-context, project-breadcrumb, datasource routes |
| `useGetConversationsByProject` | No | project-context consumers, conversation/index |

**Recommendation:** Add `options?: { enabled?: boolean }` to `useGetProjectById` (and optionally `useGetConversationsByProject`) for consistency and to allow `enabled: !!id`-style overrides from providers. Keep default behavior `enabled: !!id` when options are omitted.

---

## 3. Parameter types: `string` vs `string | undefined`

**Issue:** Mixed conventions force callers to use `slug ?? ''` or `projectSlug || ''`.

- **Strict `string`:** `useGetProjectBySlug(repository, slug: string)`, `useGetDatasourceBySlug(..., slug: string)` — callers pass `slug ?? ''`, `projectSlug || ''`.
- **Permissive:** `useGetConversationsByProject(..., projectId: string | undefined)`, `useGetNotebooksByProjectId(..., projectId: string | undefined)` — callers pass `projectId` directly; hook uses `enabled: !!projectId` and often `projectId || ''` in key/fn.

**Recommendation:** Pick one convention and document it.

- **Option A (current mix):** Keep as-is; document that “identifier” hooks take `string` (empty string = skip via `enabled`), and “by parent” hooks may take `string | undefined`.
- **Option B (unify):** Allow `string | undefined` for the identifier in all hooks, use `enabled: !!identifier` and `identifier ?? ''` in key/fn. Then project-context can pass `slug` instead of `slug ?? ''` where slug is `string | null` (still need `slug ?? ''` or adjust types).

No change required for correctness; this is mostly ergonomics and consistency.

---

## 4. Project-context usage of the hooks

**Current usage:**

```ts
// use-get-datasources
const datasource = useGetDatasourceBySlug(
  repositories.datasource,
  dsSlug ?? '',
  { enabled: isDsRoute && !!dsSlug },
);

// use-get-projects
const projectFromDs = useGetProjectById(
  repositories.project,
  datasource.data?.projectId ?? '',
);
const projectBySlug = useGetProjectBySlug(repositories.project, slug ?? '', {
  enabled: !!slug,
});
```

**Findings:**

- **useGetDatasourceBySlug:** `enabled: isDsRoute && !!dsSlug` is correct; avoids running on non-DS routes and when `dsSlug` is empty.
- **useGetProjectById:** No options; `enabled: !!id` inside the hook already prevents running when `datasource.data?.projectId ?? ''` is `''`. Usage is correct.
- **useGetProjectBySlug:** `enabled: !!slug` avoids running when `slug` is null/empty. Correct.

**Minor:** Passing `slug ?? ''` and `enabled: !!slug` is redundant but clear; no change needed.

---

## 5. Query key helpers and naming

**Issue:** Project hooks use inline keys; datasource/notebook hooks use helpers.

- **use-get-projects:** `['project', id]`, `['project', slug]` — no `getProjectKey` or `getProjectBySlugKey` exported.
- **use-get-datasources:** `getDatasourceKey(slug)` — name says “id” but argument is slug for `useGetDatasourceBySlug`.

**Recommendation:**

- Export `getProjectKey(idOrSlug: string)` (or separate `getProjectByIdKey` / `getProjectBySlugKey` if you want distinct key shapes) and use it in `useGetProjectById` / `useGetProjectBySlug` so cache keys and invalidation stay consistent.
- Rename or overload `getDatasourceKey` so it’s obvious when the argument is a slug (e.g. `getDatasourceBySlugKey(slug)`) if you ever have both “by id” and “by slug” in that file.

---

## 6. Forwarding React Query options

**Issue:** Custom hooks only expose a narrow `{ enabled?: boolean }` (and sometimes `refetchInterval`). They do not forward `UseQueryOptions` (e.g. `staleTime`, `retry`, `refetchOnWindowFocus`).

**Recommendation:** Keep the current “minimal options” design unless you need overrides. If you do, add a second, optional argument that is forwarded to `useQuery` (e.g. `queryOptions?: Pick<UseQueryOptions, 'staleTime' | 'retry'>`) so the default `staleTime` and behavior remain in one place. Prefer that over spreading a full `UseQueryOptions` to avoid accidental overrides of `queryKey`/`queryFn`.

---

## 7. Summary

| Area | Severity | Action |
|------|----------|--------|
| `enabled` when options passed + empty param | Medium | Use `options.enabled && !!param` in `useGetDatasourcesByProjectId` and `useGetMessagesByConversationSlug`. |
| `useGetProjectById` has no options | Low | Add `options?: { enabled?: boolean }` for API consistency; default `enabled: !!id`. |
| Param type `string` vs `string \| undefined` | Low | Document or unify; optional cleanup in callers. |
| Query key helpers for projects | Low | Export and use `getProjectKey` (or by-id/by-slug) in project hooks. |
| Forwarding RQ options | Optional | Keep minimal options unless you need overrides; then add a small, typed slice. |

Project-context’s use of `useGetDatasourceBySlug`, `useGetProjectById`, and `useGetProjectBySlug` is correct; the main follow-ups are consistent `enabled` semantics and small API/naming improvements in the query hooks.
