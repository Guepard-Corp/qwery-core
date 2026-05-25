# UI Decisions — MVP scope (Session 2026-05-22 → 2026-05-23)

Sister document to `decisions.md`. Tracks UI-specific decisions for the qwery-agent TUI. MVP focus first; the deferred backlog below captures topics to revisit.

## Decisions (MVP)

| # | Topic | Decision | Rationale |
|---|-------|----------|-----------|
| U1 | Overall layout | **Two togglable layout modes**: **`split`** (Chat left, active artifact right, side by side — the default) and **`focus`** (single tab full screen, k9s / lazygit pattern). Toggle via `/layout` slash command or `Ctrl+B` hotkey | Revised twice on 2026-05-23 — first added the split toggle, then made `split` the default. For data work, co-visibility of conversation and result is the dominant need; `focus` is the override when the table needs full width or the chat needs to breathe |
| U2 | Tabs (MVP) | **Three active tabs: `Chat`, `Results`, `Queries`** — `Schema` and `History` scaffolded but disabled in MVP | Fixed views (not per-result tabs) keep the model predictable. Multi-result management lives notebook-style inside Chat; `Results` zooms on the active one. `Queries` exposes saved `QueryArtifact`s (see decision #26) as first-class reusable assets |
| U3 | Tab navigation | `Tab` / `Shift+Tab` cyclic, `Ctrl+1..N` direct, `Esc` returns to `Chat`, `?` opens help overlay | Standard TUI muscle memory. Badge marker on `Results` when a new result arrives |
| U4 | Tool-call rendering | **Box collapsed by default with preview**, status indicator (`running` / `done` / `error`), elapsed timer | Conversation stays scannable; details on demand. Status + timer give live feedback on slow queries |
| U5 | Table rendering | **`ink-table`** with DuckDB-CLI-inspired truncation: `…` between first and last columns when too wide; `…` between first and last rows when too tall | Familiar to DE/DS users (DuckDB CLI is the reference), keeps the head + tail visible, prevents giant terminal dumps |
| U6 | Input | Multi-line input (Shift+Enter newline, Enter submit), command history (up/down), slash commands: **`/clear`**, **`/help`**, **`/session`** | Multi-line is critical for pasted SQL and longer prompts; history is a power-user reflex; slash commands give discoverable verbs without polluting the chat namespace |
| U7 | Session lifecycle | **Empty session at launch**. `/resume` lists past sessions (date + auto-generated title + preview), user picks one to resume | Predictable, no auto-load surprises; relies on the file persistence layer reused from qwery-core. Renamed from `/session` on 2026-05-23 — verb-first command (resume) is clearer than entity-first (session) |
| U8 | Queries tab — list view | Sortable list of `QueryArtifact`s: title, datasource, tags, last-run timestamp, last-result row count. Filter by tag / datasource / free-text. Keyboard navigation (`j/k` or arrows), `Enter` opens detail view | Power-user navigation; matches conventions of TUIs like lazygit / k9s |
| U9 | Queries tab — detail view | SQL with syntax highlighting, scrollable, read-only by default. Actions: **Run** (re-executes, result lands in `Results` tab), **Edit** (spawns `$EDITOR`), **Rename**, **Tag**, **Delete**. Last-result preview shown if available | `$EDITOR` integration avoids reinventing a multi-line SQL editor in Ink (would cost days for a mediocre result). Power users get their familiar editor (vim/code/nano) |
| U10 | Save flow | **Explicit promotion** from a tool-call box in `Chat`: user presses a hotkey (e.g. `s`) on the focused box → minimal prompt (`title`, optional `tags`) → persisted as `QueryArtifact`. No auto-save | Avoids index noise from exploratory queries; only curated, named queries land in the `Queries` tab. Raw history of every executed query remains retrievable via the `Message` log |
| U11 | Agent reuse of saved queries | **RAG via system prompt injection** (no new tool): before each LLM turn, top-N matching `QueryArtifact`s are retrieved (keyword + tags in MVP) and injected as "Relevant saved queries: ..." in the system prompt. Semantic embedding search deferred post-MVP | Respects decision #16 (tool minimalism) — no extra tool slot consumed. Lets the agent cite, adapt, or rerun prior good queries naturally |

## Deferred (post-MVP)

- **Schema browser tab** — hierarchical (DB → schema → table → column) + per-column metadata (nulls %, distinct count, mini-histogram)
- **History tab** — past sessions list, re-runnable queries
- **Visualizations** — ASCII / Unicode charts (bar, line, sparkline, histogram); criteria for the agent to choose viz over table
- **Multi-datasource indicator** — context badge, quick switch (`@source` syntax or palette)
- **Cost & risk indicators** — full-scan warnings, estimated rows / cost / duration before execution
- **GFS branching UI** — branch tree, time-travel checkout, data + schema diff between commits
- **Approval flows** — confirmation UI for destructive ops with impact preview ("DELETE will affect 1.2M rows")
- **SQL preview / edit cycle** — show generated SQL before execution with edit option
- **Export & share** — save result as CSV/JSON/Markdown/Parquet, copy cell/row/column, `.qwery-session` replay file
- **Per-tool rendering polish** — dedicated views for `Schema` (tree), `Profile` (per-column cards), `Sample` (compact preview)
- **Notifications / badges** — when new results arrive on inactive tabs
