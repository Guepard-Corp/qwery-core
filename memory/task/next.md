# Next session — Phase 3: Agent Runtime + dual agents

Last session ended **2026-05-23**. Phase 2 (datasources overlay, attach lifecycle, vault, system-prompt injection, session-link, csv-local + parquet + postgresql extensions, status-bar counter, markdown rendering, session title from first prompt, persistent input history, system tools `bash`/`read`/`write`, system prompt for data apps, apps/ listing injected, comparative study of pi + opencode) is done and validated.

## Validation gates at end-of-session

```bash
bun run typecheck       # ✓ clean
bun run check:arch      # ✓ 164 modules cruised, 0 violations
bun run check:privacy   # ✓ invariants hold
```

## Architectural decision: dual-agent runtime

Qwery-agent will refactor into an **Agent Runtime** that hosts two specialized agents:

- **DataAgent** — owns the privacy-safe pipeline: `Schema`, `Query` (aggregate-only), `Describe`, `Present` (Mustache, local-render). Knows about attached datasources via the SDK, never sees row data (ADR #28). Reads `bash`/`read` only for code/configs, never data files.
- **CodingAgent** — owns the deliverable pipeline: `Edit`, `Read`, `Write`, `Bash`. Builds and updates apps under `apps/<slug>/`. Sees and can modify files freely (no privacy boundary on workspace code).

Both share the same agent-core runtime (hooks: `beforeToolCall`, `afterToolCall`, `shouldStopAfterTurn`, `prepareNextTurn`, parallel/sequential tool execution). Subagents can be spawned dynamically (later).

The runtime extraction itself is light — `runAgent` already does most of the orchestration. The split is mostly in:
- Per-agent system prompt selection (DataAgent vs CodingAgent base prompt).
- Per-agent tool roster (DataAgent only gets data tools + read-only system tools; CodingAgent gets full system tools + Edit).
- Per-agent context injection (DataAgent sees datasources, CodingAgent sees `apps/` tree).

The user-facing routing: either explicit (slash command or first message keyword) or implicit (heuristic on prompt intent). Likely implicit for MVP.

## Comparative study summary (pi + opencode vs qwery-agent)

Read in full when starting the next session: see "Insights" section below.

### What qwery-agent borrows (in priority order, decisions confirmed 2026-05-23)

1. **`Edit` tool** — multi-replacement with fuzzy matching (smart quotes / dashes / NBSP normalization), inspiration **pi** for simplicity. Each call takes `Array<{oldText, newText}>` validated against the current file. Diff preview before exec. Replaces the current `write`-full-rewrite for app updates. **Critical for the "update an existing app" UX problem from session 2026-05-23.**
2. **`Grep` tool** — **NOT added**. Keep `bash` + `rg`/`grep` instead, per tool minimalism. Re-evaluate if the LLM consistently fails at shell invocations.
3. **Skills** (`SKILL.md`) — load from `<workspace>/.qwery/skills/` and `~/.qwery/skills/`. Frontmatter with `name` (≤64 chars, kebab-case), `description` (≤1024 chars). Inject titles in system prompt, LLM reads the full file via `read` when relevant. Spec inspired by pi (strict validation).
4. **Subagents** — dynamic spawn, **deferred but planned**. Pattern: primary agent orchestrates, subagents specialize (e.g. one DataAgent per datasource in a multi-source dashboard request).

### What qwery-agent does NOT borrow (decisions confirmed 2026-05-23)

| Feature | Source | Status | Reason |
|---|---|---|---|
| `Grep` ripgrep-backed | opencode | **skipped** | Achievable via `bash`. Add only if LLM repeatedly fails shell `rg` calls. |
| Permission V2 (wildcard rules) | opencode | **deferred** | Not needed at this stage. Revisit when write-capable datasource extensions land (mysql, postgres writes). |
| MCP support | opencode | **deferred** | Not at this stage. Plan in ADR #5 stays valid for later. |
| Plan mode (read-only → validate → write) | opencode | **skipped** | Each agent can produce its own plan in its reply; no need for a separate mode. |
| Snapshot/revert (git-backed) | opencode | **deferred** | Not now. Consider once apps become non-trivial. |
| SQLite + Drizzle persistence | opencode | **deferred** | JSON-file persistence is fine until it isn't. Revisit when it becomes painful. |

### Implementation order for Phase 3

1. **Extract Agent Runtime** (lightweight) — split `runAgent` into a runtime that accepts an `AgentSpec` (name, base prompt, tool roster, context provider). Wire two AgentSpecs: `DataAgent` and `CodingAgent`.
2. **Add `Edit` tool** — implement in `packages/application/src/tools.ts` + `system-tools.ts`. Schema: `{ path, edits: Array<{ oldText, newText }> }`. Fuzzy match for whitespace / smart quotes / line endings. Atomic per-call (all or none). Mutation queue per path (single-threaded edits on the same file). Bind to `CodingAgent`.
3. **Add Skills loader** — `apps/cli/src/infra/skills.ts` scans `<workspace>/.qwery/skills/` + `~/.qwery/skills/` for `SKILL.md`. Parse frontmatter, validate name/description. Inject as a `<skills>` block in the system prompt (each agent sees only the skills relevant to its scope, or both share — TBD).
4. **Intent routing** — at submit time, decide which agent handles the turn. MVP heuristic: if the prompt mentions "table", "query", "data", "csv", "dashboard data" → DataAgent; if it mentions "app", "write", "fix", "code", "html" → CodingAgent. Override via `/data` and `/code` slash commands.
5. **Subagent scaffold** (later) — allow a primary agent to spawn a subagent with its own AgentSpec and a focused prompt. Used initially for "explore multiple tables in parallel".

## Open design points to clarify before Phase 3 starts

- **Intent routing**: heuristic, slash-command, or both? Heuristic risks misclassification; slash-command is explicit but UX friction.
- **Shared tools**: should both agents share `bash` and `read`? My recommendation: yes for `read` (both need to inspect files), but `bash` only on CodingAgent (DataAgent has no reason to spawn shells).
- **Single message stream or per-agent stream**: when two agents collaborate on a turn, do they share the `session.current: ModelMessage[]` or each maintains its own? Cleaner: shared stream, agents tagged in tool events.
- **Skills scoping**: does a `SKILL.md` declare which agent it applies to (frontmatter `agent: data|code|all`)? Or are skills global and the LLM picks? Pi makes them global; opencode allows scoping. Tentative: scope via frontmatter for clarity.

## Still open (carried from earlier sessions)

- Edit existing datasources (overlay supports list/new/attach/delete, not `e edit`).
- OS Keychain backend for `ISecretVault` (ADR #19's preferred path; current FileSecretVault is the fallback).
- Extension loader (npm discovery via `node_modules/@qwery/extension-*`) — currently first-party static imports cover MVP.
- Tests — coverage thresholds in ADR #16 not yet enforced.
- Privacy extension — extend `tooling/privacy-check.ts` to assert attach-output (table names + schemas) is the only datasource-derived data reaching the LLM prompt.

## Insights from comparative study (pi + opencode)

Saved verbatim because they inform many later decisions. Re-read when designing the runtime or any new tool.

### pi (@earendil-works/pi-coding-agent + pi-agent-core)

- Three-layer architecture: provider (`pi-ai`) → runtime (`pi-agent-core` with explicit hooks) → metier (`pi-coding-agent`). Same shape we want for qwery-agent.
- Hooks worth importing: `beforeToolCall` (block + reason), `afterToolCall` (override result), `shouldStopAfterTurn`, `prepareNextTurn`, `getSteeringMessages`, `getFollowUpMessages`. Parallel/sequential tool execution mode.
- Tools: `read`, `write`, **`edit`** (multi-target replace + fuzzy normalization for smart quotes / Unicode dashes / NBSP / line endings), `grep`, `find`, `ls`, `bash` (with OutputAccumulator that spills to /tmp). Mutation queue per path.
- Skills: `SKILL.md` discovery, strict frontmatter spec, validation of name + description lengths.
- Prompt templates: `<workspace>/.pi/prompts/*.md` → custom slash commands with `$1`/`$2` arg substitution.
- Compaction: extracts file ops (reads, modifies) explicitly so post-compaction the LLM "remembers" what it has touched.
- Session tree: `/fork`, `/clone`, `/tree`, `parentSession` in header.
- Output guard: `takeOverStdout()` redirects raw stdout to stderr to prevent chatty libs from corrupting the TUI.
- macOS path normalization: NFD, narrow no-break space (AM/PM), smart quotes — robust to user copy-paste from screenshots.

### opencode (@anomalyco/opencode)

- Effect-based composition (services, layers, schemas). Powerful but steep learning curve.
- Tools: `read`, `edit` (Cline/Gemini fuzzy), `apply_patch` (aider diff format), `glob` (ripgrep), `grep` (ripgrep), `shell`, `lsp` (symbols/diagnostics), `question` (LLM asks user), `skill`, `mcp-websearch`, `plan` (read-only mode), `repo_overview`, `repo_clone`.
- Permission system V2: rules `(permission, pattern, action: allow|deny|ask)` with wildcard matching. Configurable per agent profile. Bash arity dictionary identifies the "human command" (e.g. `git checkout main` → `git checkout`) for matching.
- Skills: `SKILL.md` discovery from opencode + `.claude/` + `.agents/`. Built-in defensive skill `customize-opencode` triggers when LLM edits opencode's own config.
- MCP native: stdio + SSE + HTTP, OAuth flow, hot reload via `ToolListChangedNotificationSchema`.
- Snapshots: git-backed, prune 7 days, limit 2MB. Enables `/revert`.
- SQLite + Drizzle ORM persistence (sessions, messages, parts, permissions, projects, workspaces).
- Subagent model: `mode: subagent | primary | all` with own prompt + permissions + tool subset.
- LSP integration: agent queries language LSP for symbols, diagnostics, definitions.
- Compaction: overflow detection + retry + reminders ("you already read `file.ts` at 14:32").
- Plan mode: read-only exploration, validate, then write.
- Bus events: pub/sub centralized.

### Qwery-agent exclusive advantages (DO NOT lose them)

- **Privacy boundary (ADR #28)**: `Schema`/`Query`/`Describe`/`Present` cloister LLM from row data. No equivalent in pi or opencode.
- **Datasource extensions with attach lifecycle**: csv-local, parquet, postgresql via shared SDK + `queryEngineConnection`. No equivalent.
- **DuckDB-first federated query engine**: bundled, no external backend.
- **Mustache `present`**: LLM writes template, render is local — unique pattern for "view data without exposing it to the LLM".
- **GFS auto-branching (ADR #11)**: not yet implemented, but the only path to a safe data agent.
