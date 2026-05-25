# TUI e2e plan

End-to-end tests drive the real `<App>` via `ink-testing-library` with mocked services
(`makeMockServices`). Each test renders the app, sends keystrokes through `stdin`, polls
frames with `waitForFrame`, asserts observable output, and captures an HTML "screenshot"
(`captureFrame`) + a text-frame snapshot.

Two service tiers:
- `memory` (default): everything in-memory — fast, isolates the UI.
- `sqlite-memory`: real `bun:sqlite` `:memory:` + real DuckDB — exercises the DB layer.

## Slash commands — coverage matrix

Tiers by implementation cost / determinism. Start at the top.

### Tier 1 — instant, deterministic chat output (no I/O) ✅ `slash-basic.e2e.test.tsx`
| Command | Assert | Status |
|---|---|---|
| `/help` | chat shows `Slash commands:` | ✅ |
| `/data` | `Agent routing pinned to: DataAgent.` | ✅ |
| `/code` | `Agent routing pinned to: CodingAgent.` | ✅ |
| `/auto` | `Agent routing pinned to: auto (heuristic).` | ✅ |
| `/logs` | `Logs are written to` | ✅ |

> UX note surfaced by e2e: in slash mode, Enter submits the **highlighted autocomplete
> suggestion**, not the literal text. `/data` + Enter actually fires `/datasources` (shared
> prefix, listed first). `sendCommand` navigates to the exact match via `matchCommands`,
> mirroring the real user gesture (arrow-down). Worth considering an exact-match priority
> in the input bar.

### Tier 2 — UI state toggles ✅ `slash-state.e2e.test.tsx`
| Command | Assert | Status |
|---|---|---|
| `/layout` (`/split`,`/focus`) | split→focus: TabBar `Tab: switch` appears | ✅ |
| `/clear` | prior chat entries removed | ✅ |
| `/context` | `Context Usage` overlay | ✅ |

### Tier 3 — overlays ✅ `slash-overlays.e2e.test.tsx`
| Command | Assert | Status |
|---|---|---|
| `/models` | `Connect a provider` (snapshot) | ✅ |
| `/datasources` | `Datasources` (snapshot) | ✅ |
| `/agents` | `Subagents` (fs-dependent → screenshot only) | ✅ |
| `/resume` | `Resume a session` (timestamped → screenshot only) | ✅ |

### Tier 4 — lifecycle / backend
| Command | Assert | Status |
|---|---|---|
| `/quit`, `/exit` | app exits (ink `exit()` called) | ⏭ skipped — ink-testing-library@4 exposes no `waitUntilExit`/`onExit`, so the exit is not observable. Would need an injected exit hook. |
| `/update` | staged-update hint (`⟳`) + `/update` reports version | ✅ `updater.e2e.test.tsx` |

> Failure detection: `waitForFrame` writes a `FAILED-<label>.html` screenshot on timeout
> (Playwright-style) and the error names the artifact path. A broken command never produces
> the awaited frame → timeout → red, with the actual screen captured for diagnosis.

## Non-slash flows
- chat turn → message persisted (sqlite-memory) ✅ `chat-persist.e2e.test.tsx`
- chat turn with a tool call (`runQuery` via real DuckDB, scripted mock tool-call) ✅ `chat-tool.e2e.test.tsx`
- `!cmd` local shell passthrough ✅ `chat-shell.e2e.test.tsx`
- abort (Ctrl+C) mid-stream ✅ `chat-abort.e2e.test.tsx`
- input history (↑/↓), slash-command autocomplete ✅ `input.e2e.test.tsx`

---

## LLM evals (real model) — separate tier, `evals/`

The mock-LLM e2e above validate **wiring**; they cannot validate that the agent is
*correct*. That is the job of `evals/` — the real-model tier (run locally / nightly,
NOT in PR CI).

- Headless: reuses `runAgent` (no TUI) + real DuckDB + a real model via OpenAI-compatible
  (`evalModel()` from env; default Ollama `qwen3-coder:30b`, override `QWERY_EVAL_BASE_URL`/
  `QWERY_EVAL_MODEL`/`QWERY_EVAL_API_KEY` for Groq/Cerebras/…).
- Success is **machine-checked from the tool trace**, not judged: NL→SQL must use the
  privacy-safe `runQuery` AND land on the golden scalar.
- Stochastic → each scenario runs N times; passes if pass-rate ≥ threshold (safety/privacy → 1.0).
- Run: `cd evals && bun run evals` (skips cleanly if no model endpoint is reachable).

| Scenario | Check | Status |
|---|---|---|
| NL→SQL · order count | runQuery used + golden scalar (3) hit | ✅ `evals/src/scenarios/nl-to-sql.ts` |
| Privacy never leaks rows | no `bash`/`read` on data files; only runQuery/present | ☐ |
| Tool selection (runQuery vs present vs schema) | right tool per task shape | ☐ |
| GFS safety (commit before destructive op) | branch/commit precedes DROP | ☐ (needs GFS write path) |
