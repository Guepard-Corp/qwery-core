# File storage repository plan (updated: prefixed sortable IDs)

## Decision: prefixed and sortable IDs

Use **prefixed, time-ordered (sortable) IDs** for file storage so that:

- **Listing and sorting by filename = creation order** without parsing JSON.
- `Storage.list(['message', conversationId])` returns keys that sort chronologically; sort keys ascending = oldest first, descending = newest first.

## 1. Identifier module (opencode-style, time-ordered)

- **Location**: `packages/repositories/file/src/id.ts`
- **Same algorithm as opencode** [opencode id.ts](opencode/packages/opencode/src/id/id.ts):
  - Encode `timestamp * 0x1000 + counter` into 6 bytes (hex) + random base62 suffix.
  - **Ascending** (e.g. `create(prefix, false)`): positive encoding → older ids sort first.
  - **Descending** (e.g. `create(prefix, true)`): bitwise NOT → newer ids sort first.
- **Prefixes** for qwery entities:

  | Entity       | Prefix |
  |-------------|--------|
  | project     | prj    |
  | organization| org    |
  | user        | usr    |
  | datasource  | dts    |
  | notebook    | nbk    |
  | conversation| conv   |
  | message     | msg    |
  | usage       | usg    |

- **API**: `create(prefix, descending?: boolean)`, `schema(prefix)` (Zod), `timestamp(id)` (for ascending ids), optional `ascending(prefix, given?)` / `descending(prefix, given?)` for validation.
- **File repo**: On `create()`, generate id with `Id.create('project', false)` (ascending) so string sort of filenames = creation order.

## 2. Domain: accept prefixed ids

- Entity schemas today use `z.string().uuid()` for `id` (and foreign keys like `organizationId`, `projectId`).
- **Change**: Relax primary-entity `id` to accept **either UUID or prefixed id** so file-created entities are valid:
  - Option A: `z.string().min(1)` for `id` on Project, Organization, User, Datasource, Notebook, Conversation, Message (simplest; allows any string id).
  - Option B: `z.union([z.string().uuid(), Id.schema('project')])` per entity (stricter; requires importing Id in domain or defining a shared id schema).
- **Recommendation**: Option A in domain (`z.string().min(1)` for id) so sqlite/memory can keep using UUID and file repo uses prefixed; no dependency from domain to repository-file.
- **Foreign keys** (e.g. `projectId`, `organizationId`): keep as `z.string().min(1)` or same union so they can reference either UUID or prefixed id.

## 3. Storage layout unchanged

- Root: `~/.local/share/qwery/storage` (or `QWERY_STORAGE_DIR` / XDG).
- One folder per entity: `project/`, `organization/`, `user/`, `datasource/`, `notebook/`, `conversation/`, `message/`, `usage/`.
- File path: `entityFolder/<id>.json` where `<id>` is the **prefixed sortable id** (e.g. `prj_0a1b2c...`).
- **Message**: key `['message', conversationId, id]` → path `message/<convId>/<id>.json`; list under `['message', conversationId]` then sort keys = order by createdAt without parsing.

## 4. Usage entity

- Domain `Usage` has `id: number`; `IUsageRepository` is `RepositoryPort<Usage, string>` so port id type is string.
- For file storage: use **prefixed id** as the primary key (e.g. `usg_xxx`), store numeric `id` inside JSON for compatibility (e.g. derived from timestamp or counter). Or make Usage id `string` in domain when using file backend; cleanest is `id: string` in file-stored Usage (usg_xxx) and keep number only for in-memory/sqlite if needed).

## 5. Benefits

- **No JSON read for order**: `list()` + sort keys = creation order (oldest/newest first).
- **Consistent with opencode**: Same Identifier shape (prefix + time-ordered suffix).
- **Type in id**: Filename is self-describing (prj_, msg_, etc.) in addition to folder.

## 6. Implementation checklist (add to main plan)

- [ ] Add `packages/repositories/file/src/id.ts` with opencode-style time-ordered Identifier (prefixes above, create, schema, timestamp).
- [ ] Relax domain entity `id` (and relevant FKs) from `z.string().uuid()` to `z.string().min(1)` for Project, Organization, User, Datasource, Notebook, Conversation, Message (and Usage if switching to string id).
- [ ] File repo `create()`: use `Id.create(prefix, false)` for new entity id; store that id in entity and use as filename.
- [ ] Repositories that list by creation order: `Storage.list(prefix)` then sort key arrays by last segment (id string); no JSON parse for ordering.
- [ ] Tests: assert that listing and sorting keys yields same order as sorting by `createdAt` in parsed JSON.
