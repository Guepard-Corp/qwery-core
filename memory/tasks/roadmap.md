# Roadmap — gaps to a complete data + coding agent

Captured 2026-05-24 after the dual-agent rewrite + compaction landed. Items are ordered by **user value perceived × implementation cost**, not by ADR order.

## Priority table

| # | Item | Why now | Est. cost |
|---|---|---|---|
| 1 | Tests on domain + application + adapters (raise to ADR #16 thresholds) | Refactors break silently without them. ADR #16 already prescribed but never enforced. | 3–5 days |
| 2 | Project context auto-load (AGENTS.md / CLAUDE.md / README / package.json) | ~1h of work, immense UX gain for CodingAgent. pi + opencode do this. | 1h |
| 3 | Artifact system MVP (`QueryArtifact`) | Product differentiator vs a generic LLM wrapper. Entity exists, runtime hookup missing. | 1–2 days |
| 4 | Abort streaming + AbortController plumbing | UX critical: today Ctrl+C kills the app, not just the turn. **NEXT** | 3h |
| 5 | Diff viewer for Edit in Results pane | Tool already produces a diff; current display in tool-call is 4 lines. Needs side-by-side. | 4h |
| 6 | MCP support (stdio + SSE + HTTP) | Ecosystem multiplier: Notion / Slack / GitHub / Linear gratis via existing servers. ADR #5 already commits to it. | 1–2 days |
| 7 | SQLite + Drizzle migration for persistence | JSON files start to freeze at ~500 sessions × 20 msg. `messageRepo.findAll()` reads everything for history. | 2–3 days |
| 8 | MySQL + SQLite extensions | Datasource standards. MySQL via DuckDB scanner (~2h), SQLite native DuckDB ATTACH (~1h). | 1 day |
| 9 | GFS auto-branching (ADR #11) | Required before any write-capable datasource extension. DROP / DELETE / TRUNCATE / UPDATE without WHERE auto-branched. | 2–3 days |
| 10 | LSP integration (TypeScript first) | Major CodingAgent differentiator — code-aware edits. opencode pattern. | 3–5 days |
| 11 | Distribution: Bun binaries + install script (`get.qwery.dev`) | Users cannot install yet. ADRs #9 + #23 prescribe this. | 2 days |
| 12 | Bash sandbox (macOS Seatbelt / Linux bubblewrap) | Required for non-trivial deployment. ADR #18. | 3–5 days |

## Nice-to-have polish (post-table)

- `/usage` overlay with cost-per-day chart
- `/artifacts` overlay (after #3 lands)
- Help overlay (`?` keybind)
- Schema diff overlay (`/diff ds1 ds2`)
- `qwery doctor` diagnostic command
- Telemetry (ADR #22)
- Snapshot/revert for app edits (opencode pattern)
- Charts/viz primitives (sparkline → PNG export → browser viz)

## Data-agent-specific gaps

- **Saved queries / Querybooks** (lives inside Artifact system)
- **Schema search / autocomplete** in the TUI
- **Datasource extensions still missing**: MySQL, SQLite, Snowflake, BigQuery, REST API generic, Excel (.xlsx)

## Coding-agent-specific gaps

- **LSP** (covered above)
- **Snapshot/revert** for app edits
- **Project context auto-load** (covered above)
- **Build / test integration** (run package scripts, parse failures)
- **Git ops** (commits, branches, PR diffs from the agent)

## Notes on the priority ordering

- Tests (#1) is first because the architecture is sound but uncovered — a refactor risk magnet.
- #4 (abort) is small but blocks daily use — picked next for that reason.
- #6 (MCP) ranks above #10 (LSP) because MCP unlocks integrations gratis, LSP is a longer build for a narrower gain at this stage.
- #9 (GFS) gates #7 in the postgresql roadmap (we can't ship write-capable Postgres without GFS).
