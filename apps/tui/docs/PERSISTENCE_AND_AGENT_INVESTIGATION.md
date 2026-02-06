# TUI vs Web: Persistence and Agent Investigation (read-only)

No code changes; analysis only.

---

## 1. Persistence: where the server stores data

### (a) Conversations, datasources, projects (file storage)

- **Backend:** `@qwery/repository-file`. All entities are JSON files under a single **storage directory**.
- **Storage directory** is chosen in this order:
  1. `process.env.QWERY_STORAGE_DIR`
  2. `process.env.VITE_DATABASE_PATH`
  3. `process.env.DATABASE_PATH`
  4. If none set: **Linux** `$XDG_DATA_HOME/qwery/storage` or `~/.local/share/qwery/storage`; **Windows** `%LOCALAPPDATA%/qwery/storage`.

  Set in **server** at startup: `apps/server/src/lib/repositories.ts` calls `setStorageDir(storageDir)` with `QWERY_STORAGE_DIR ?? VITE_DATABASE_PATH ?? DATABASE_PATH` (only if one is set). If **none** of these env vars are set, `setStorageDir` is never called and the file repo uses its default (`getDataDir()` in `packages/repositories/file/src/path.ts` → `~/.local/share/qwery/storage` on Linux).

- **File layout** (under that storage dir):
  - `conversation/<id>.json` — id = UUID
  - `datasource/<id>.json`
  - `project/<id>.json`
  - `organization/<id>.json`
  - `user/<id>.json`
  - `notebook/<id>.json`
  - `message/<conversationId>/<messageId>.json`
  - `usage/<numericId>.json`
  - `todo/<conversationId>.json`

- **Lookups:** Conversations are stored by **id** (UUID). `findBySlug(slug)` loads all conversations and returns the one with `c.slug === slug`. So the **slug** in the URL (e.g. `/api/chat/KAF7YUf5AU`) must equal the `slug` field stored in the conversation JSON.

### (b) DuckDB per-conversation

- **Path:** `{workspace}/{conversationId}/database.duckdb` (and sometimes `database.db` in older/alternate code).
- **Workspace root** is **not** the same as the storage dir above. It is used only for DuckDB (and attachments). Resolved at runtime in:
  - **Server** (`apps/server/src/index.ts`): `process.env.WORKSPACE ?? process.env.VITE_WORKING_DIR ?? process.env.WORKING_DIR ?? 'workspace'` → default **`workspace`** (relative to server process cwd).
  - **Notebook query** (`apps/server/src/routes/notebook-query.ts`): `getWorkspaceDir()` = `WORKSPACE ?? QWERY_WORKING_DIR ?? WORKING_DIR ?? '.'`.
  - **Agent / orchestration** (`packages/agent-factory-sdk`): `resolveWorkspaceDir()` = `process.env.WORKSPACE ?? process.env.VITE_WORKING_DIR ?? process.env.WORKING_DIR` (no default; can be undefined in browser).

- So **DuckDB files** live under: `{WORKSPACE or cwd}/workspace/{conversationId}/database.duckdb` when the server runs with default `WORKSPACE=workspace` and cwd = e.g. repo root or `apps/server`.

---

## 2. How the server decides workspace root and storage dir

| What            | Env vars (order)                          | Default (when none set)     |
|----------------|--------------------------------------------|-----------------------------|
| **Storage dir** (conversations, datasources, projects, usage, etc.) | `QWERY_STORAGE_DIR`, `VITE_DATABASE_PATH`, `DATABASE_PATH` | Linux: `~/.local/share/qwery/storage`; Windows: `%LOCALAPPDATA%/qwery/storage` |
| **Workspace dir** (DuckDB, attachments) | `WORKSPACE`, `VITE_WORKING_DIR`, `WORKING_DIR` | Server: `'workspace'` (relative to server cwd); agent-factory-sdk: none (can be unset) |

- **Server startup** (`apps/server/src/index.ts`): Reads `apps/server/.env` into `process.env`, then sets `process.env.WORKSPACE = raw` with `WORKSPACE ?? VITE_WORKING_DIR ?? WORKING_DIR ?? 'workspace'`. So the **server** always has a workspace root (at least `'workspace'`). Storage dir is set only if one of the three env vars above is set; otherwise file repo uses its default (e.g. `~/.local/share/qwery/storage`).
- **Cwd:** When you start the server (e.g. `pnpm --filter server dev` from repo root), cwd is typically `apps/server`. So default workspace path becomes `apps/server/workspace` (relative). If you start from repo root with cwd = repo root, then `workspace` = repo root `/workspace`.

---

## 3. TUI vs Web: how each gets projectId

- **Both** get projectId from **POST /api/init** (same backend).
  - **TUI:** `ensureServerRunning()` → `initWorkspace(apiBase(root))` → `POST {base}/init` with `{ runtime: 'desktop' }` → response `workspace` with `project.id`, stored in TUI state `state.workspace.projectId`.
  - **Web:** The web app’s route `api/init` is a **proxy**: it calls `fetch(backendUrl + '/init', ...)` where `backendUrl` = `VITE_API_URL ?? SERVER_API_URL ?? 'http://localhost:4096/api'`. So the browser calls the **same** backend `/init` (when both use default 4096). Response is used by the web app as **workspace** (including `projectId`); the web may also persist project/slug in **localStorage** (e.g. project layout, conversation slug, bookmarks).

- **Why TUI might see “no persistent datasources” or a different project**
  1. **Different server instance:** TUI uses `http://localhost:4096` (or `QWERY_SERVER_URL`). If the web uses a different `VITE_API_URL` (e.g. another port or host), they hit different backends → different storage dirs / different default org+project → different projectIds and datasource lists.
  2. **Storage dir not set on server:** If the server is started **without** `QWERY_STORAGE_DIR` / `VITE_DATABASE_PATH` / `DATABASE_PATH`, file repo uses **default** `~/.local/share/qwery/storage`. If the server is sometimes started **with** one of these (e.g. in .env), then storage is under that path. So two different ways of starting the server can lead to two different storage dirs → TUI and web can see different data if they’re not both talking to the same process with the same env.
  3. **TUI state is in-memory:** TUI does not persist projectId/datasources to disk; it refetches from the server (init, list conversations, list datasources). So “no persistent datasources” usually means: the **server** that TUI is calling has no datasources in **its** storage dir for the project returned by init. That again points to “different server” or “different storage dir” for the process TUI hits.

---

## 4. Agent: “Failed to persist usage”

- **Where it’s logged:** `packages/agent-factory-sdk/src/agents/agent-session.ts` (and similarly in `run-agent-to-completion.ts` / `factory-agent.ts`): in `onFinish`, `UsagePersistenceService.persistUsage(...)` is called and its `.catch()` logs `[AgentSession] Failed to persist usage:` (or equivalent).

- **What it does:** `UsagePersistenceService` (same package) calls **domain** `CreateUsageService.execute({ input, conversationSlug })`. That service:
  1. **Conversation:** `repos.conversation.findBySlug(conversationSlug)` — must find exactly one; otherwise throws (e.g. “Conversation with slug 'X' not found”).
  2. **Project:** `repos.project.findById(conversation.projectId)` — must find the project; otherwise throws (“Project with id 'Y' not found”).
  3. **Usage:** `repos.usage.create(usageEntity)` — writes `usage/<numericId>.json` under the **storage dir** (same as above).

- **Why it can fail**
  1. **Conversation not found by slug:** The chat route uses **URL param** `slug` (e.g. `POST /api/chat/KAF7YUf5AU`). That value is passed to the agent as `conversationSlug`. If the conversation in the **file repo** (for the process handling the request) has a different `slug` (or doesn’t exist), `findBySlug(conversationSlug)` returns null → domain throws → “Failed to persist usage”. So: **slug in URL must match `conversation.slug`** in the same storage the server uses.
  2. **Project not found:** Conversation is found but `conversation.projectId` points to a project that doesn’t exist in the same storage (e.g. wrong storage dir or stale id) → “Failed to persist usage”.
  3. **Usage repo write failure:** Less common (e.g. disk, permissions); would also surface as “Failed to persist usage”.

- **TUI vs Web for chat:** Both must call **POST /api/chat/:slug** with the **same slug** the server has stored for that conversation. TUI uses `conv.slug` (from list conversations or create response). If TUI ever sent `conv.id` (UUID) instead of `conv.slug`, the server would look up by slug and not find it (slug is typically a short string like `KAF7YUf5AU`). That would break message/agent flow and can also lead to usage persist failing if the agent later looks up by that slug.

- **Mismatch:** If the **conversation** was created on a server instance that uses **storage A**, and the **chat/agent** runs on a server instance that uses **storage B**, then `findBySlug(slug)` on storage B may not find that conversation → “Failed to persist usage”. So **same server process and same storage dir** are required for chat and usage to see the same conversation/project.

---

## 5. Same data in TUI and Web: what must be the same

For TUI and web to see the **same** datasources and conversations:

1. **Same server URL**  
   TUI: `QWERY_SERVER_URL` or default `http://localhost:4096`.  
   Web: `VITE_API_URL` or `SERVER_API_URL` or default `http://localhost:4096/api` (same host/port).

2. **Same storage dir on that server**  
   The single process that handles both TUI and web must use the same storage dir. So either:
   - No `QWERY_STORAGE_DIR` / `VITE_DATABASE_PATH` / `DATABASE_PATH` (so both use default `~/.local/share/qwery/storage`), or
   - The same one of these env vars set when that process starts.

3. **Same projectId from init**  
   Both get projectId from **POST /api/init**. As long as (1) and (2) hold, the same server and same storage will return the same default org/project and thus the same projectId.

4. **Same workspace root for DuckDB (if you care about shared DuckDB files)**  
   Server’s `WORKSPACE` (or default `'workspace'`) and **cwd** when starting the server determine where `{workspace}/{conversationId}/database.duckdb` lives. For TUI and web to share the same DuckDB files, they must be using the same server process (same cwd and env).

---

## 6. Local read-only commands to see what’s persisted

Use the **same** paths the server would use when started from your usual directory (e.g. repo root or `apps/server`). Adjust if you set env vars.

### 6.1 Storage directory (conversations, datasources, projects, usage)

- **If you set** `QWERY_STORAGE_DIR` (or `VITE_DATABASE_PATH` or `DATABASE_PATH`): use that value.
- **If you don’t set any:** use default, e.g. on Linux:
  - `~/.local/share/qwery/storage`

```bash
# Set STORAGE to the dir your server uses (from .env or default)
STORAGE="${QWERY_STORAGE_DIR:-$HOME/.local/share/qwery/storage}"

# List top-level entities
ls -la "$STORAGE"

# Conversations
ls -la "$STORAGE/conversation/"

# Datasources
ls -la "$STORAGE/datasource/"

# Projects
ls -la "$STORAGE/project/"

# Usage (numeric ids)
ls -la "$STORAGE/usage/"
```

- Inspect one conversation (replace `<id>` with a real UUID from `conversation/`):
  - `cat "$STORAGE/conversation/<id>.json" | jq .`
- Inspect one datasource:
  - `cat "$STORAGE/datasource/<id>.json" | jq .`
- Inspect one project:
  - `cat "$STORAGE/project/<id>.json" | jq .`

### 6.2 DuckDB per-conversation (workspace)

- **Workspace root:** From server env: `WORKSPACE` or `VITE_WORKING_DIR` or `WORKING_DIR`, or default `workspace` (relative to server cwd). Example: if you start server from repo root and default: `./workspace`; from `apps/server`: `apps/server/workspace`.
- **DuckDB path:** `{WORKSPACE_ROOT}/{conversationId}/database.duckdb` (or `database.db` in some code paths).

```bash
# Set WORKSPACE_ROOT to what your server uses (e.g. from apps/server or repo root)
WORKSPACE_ROOT="${WORKSPACE:-workspace}"
# If server runs from repo root:
# WORKSPACE_ROOT=/home/guepard/work/qwery-core/workspace
# If server runs from apps/server:
# WORKSPACE_ROOT=/home/guepard/work/qwery-core/apps/server/workspace

# List conversation DuckDB dirs
ls -la "$WORKSPACE_ROOT"

# For a given conversation UUID (e.g. from a conversation JSON file)
CONV_ID="<conversation-uuid>"
ls -la "$WORKSPACE_ROOT/$CONV_ID/"
# DuckDB file
ls -la "$WORKSPACE_ROOT/$CONV_ID/database.duckdb" 2>/dev/null || ls -la "$WORKSPACE_ROOT/$CONV_ID/database.db" 2>/dev/null
```

- **DuckDB CLI (read-only):** If DuckDB is installed and the file exists:
  - `duckdb "$WORKSPACE_ROOT/$CONV_ID/database.duckdb" "SELECT * FROM information_schema.tables;"`

### 6.3 One-shot: storage + workspace from server .env

```bash
# From repo root; load server .env and echo dirs (read-only)
cd /home/guepard/work/qwery-core
export $(grep -v '^#' apps/server/.env | xargs -0 -I {} sh -c 'echo "{}"' 2>/dev/null | sed 's/^#.*//' | xargs)
echo "QWERY_STORAGE_DIR=$QWERY_STORAGE_DIR"
echo "VITE_DATABASE_PATH=$VITE_DATABASE_PATH"
echo "DATABASE_PATH=$DATABASE_PATH"
echo "WORKSPACE=$WORKSPACE"
# Default storage when none of the three are set:
echo "Default storage (Linux): $HOME/.local/share/qwery/storage"
# If none of the three are set, file repo uses ~/.local/share/qwery/storage (Linux)
DEFSTORAGE="$HOME/.local/share/qwery/storage"
ls -la "${QWERY_STORAGE_DIR:-${VITE_DATABASE_PATH:-${DATABASE_PATH:-$DEFSTORAGE}}}" 2>/dev/null || true
```

(Note: loading .env with `export $(...)` can be brittle with special characters; prefer manually setting STORAGE and WORKSPACE_ROOT from your actual server .env.)

---

## 7. Issues summary

| Issue | Likely cause |
|-------|----------------|
| **Datasources “not persisting” in TUI** | TUI and web (or two runs) hit different server instances or different storage dirs → different projectId / different datasource list. Or server that TUI uses was started without the same storage dir as when you created datasources in the web. |
| **Different project in TUI vs web** | Same as above: different backend URL or different storage dir for the backend that serves each client. |
| **“Failed to persist usage”** | 1) `findBySlug(conversationSlug)` fails (conversation not in this server’s storage or slug mismatch). 2) `findById(conversation.projectId)` fails (project not in this server’s storage). 3) Usage repo write failure. Most often (1) or (2) due to wrong or different storage dir / different server. |
| **Schema/views warning in agent** | Agent/orchestration uses the same workspace and conversationId for DuckDB; if the conversation’s DuckDB doesn’t have the expected schema/tables (e.g. different datasource attach or different workspace path), schema/views may not match. |

**Same data in both clients:** Use one server URL, one storage dir, and one workspace root; start the server with the same env and cwd every time so TUI and web share the same backend and files.
