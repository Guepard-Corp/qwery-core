# Interactive REPL Mode Plan (Cursor CLI Style)

## Goal
When user runs `qwery` with no arguments, open a conversational AI-powered console where users can directly prompt queries in natural language or SQL (inspired by [Cursor CLI](https://cursor.com/cli)).

## Design Philosophy (Cursor-inspired)
- **Conversational**: Just type queries directly, no complex command structure
- **Context-aware**: Prompt shows current datasource context
- **Minimal commands**: Only essential commands like `/help`, `/exit`, `/use`
- **Clean output**: Results appear inline, formatted nicely
- **Auto-detection**: Automatically detects SQL vs natural language

## Architecture

### 1. Entry Point Changes
- **File**: `apps/cli/src/cli-application.ts`
- **Change**: When `argv.length <= 2`, enter interactive mode instead of showing help
- **New method**: `startInteractiveMode()`

### 2. Interactive REPL Service (Cursor-style)
- **New file**: `apps/cli/src/services/interactive-repl.ts`
- **Purpose**: Manages the conversational readline interface
- **Features**:
  - Prompt: `qwery>` (or `qwery [datasource-name]>` if datasource selected)
  - Command history (up/down arrows, persisted to `~/.qwery/.history`)
  - Multi-line input support (for SQL queries)
  - Minimal commands: `/help`, `/exit`, `/use <datasource-id>`, `/clear`
  - Empty input allowed (just shows prompt again, like Cursor)

### 3. Query Execution Flow
- **New file**: `apps/cli/src/services/interactive-query-handler.ts`
- **Purpose**: Routes user input intelligently
- **Logic**:
  1. Check if input starts with `/` command (e.g., `/help`, `/exit`)
  2. If empty, just continue (show prompt again)
  3. Auto-detect mode:
     - Starts with SQL keywords (`SELECT`, `INSERT`, `UPDATE`, `DELETE`, `WITH`, etc.) → SQL mode
     - Otherwise → Natural language mode (when SqlAgent ready)
  4. Execute via `NotebookRunner` (reuse existing infrastructure)
  5. Display results inline with clean formatting

### 4. Datasource Context Management
- **New file**: `apps/cli/src/services/interactive-context.ts`
- **Purpose**: Track session state
- **State**:
  - Current datasource ID (or null)
  - Workspace context
  - Last query result (for reference)

### 5. Output Formatting (Cursor-style)
- **Enhance**: `apps/cli/src/utils/output.ts`
- **Add**: `printInteractiveResult()` - clean inline output
  - Show results in table format
  - Show row count summary
  - Show SQL executed (if different from input)
  - Handle errors gracefully with helpful messages

## Implementation Steps

### Phase 1: Basic Conversational Shell (Cursor-style)
1. Create `interactive-repl.ts` with readline interface
2. Modify `cli-application.ts` to detect no-args and start REPL
3. Implement minimal commands: `/help`, `/exit`, `/clear`
4. Allow empty input (just show prompt again)
5. Test: `qwery` → should open clean prompt

### Phase 2: Datasource Context
1. Add `/use <datasource-id>` command
2. Show datasource name in prompt when selected: `qwery [name]>`
3. Validate datasource exists
4. Store context in session state

### Phase 3: Query Execution
1. Create `interactive-query-handler.ts`
2. Auto-detect SQL (starts with SQL keywords) vs natural language
3. Integrate with `NotebookRunner` (SQL mode only for now)
4. Display results inline with clean formatting
5. Handle errors gracefully

### Phase 4: Polish (Future)
1. Multi-line input support (for long SQL queries)
2. Command history persistence to `~/.qwery/.history`
3. Natural language mode (when SqlAgent ready)
4. Auto-completion hints (optional)

## File Structure

```
apps/cli/src/
├── services/
│   ├── interactive-repl.ts          # Main REPL loop
│   ├── interactive-query-handler.ts # Query routing & execution
│   ├── interactive-context.ts       # Session state management
│   └── notebook-runner.ts            # (existing, reuse)
├── utils/
│   └── output.ts                    # (enhance for REPL)
└── cli-application.ts               # (modify entry point)
```

## Example Usage Flow (Cursor-style)

```bash
$ qwery

qwery> 

# Empty prompt - just shows cursor, ready for input (like Cursor CLI)

qwery> /help
Available commands:
  /help              Show this help message
  /exit              Exit the REPL
  /clear             Clear the screen
  /use <datasource-id>  Select a datasource to query

Just type your query directly - SQL or natural language.

qwery> /use d7d411d0-8fbf-46a8-859d-7aca6abfad14
✓ Using datasource: angry-star

qwery [angry-star]> 

# Now we have context - can query directly

qwery [angry-star]> SELECT current_date

┌──────────────┐
│ current_date │
├──────────────┤
│ 2025-11-21   │
└──────────────┘
(1 row)

qwery [angry-star]> show me all users
[Natural language mode - requires SqlAgent, coming soon]

qwery [angry-star]> 

# Empty input - just shows prompt again (Cursor behavior)

qwery [angry-star]> /exit
```

## Dependencies
- Node.js `readline` (built-in, no new deps)
- Reuse existing `NotebookRunner` and `CliContainer`

## Notes
- **First**: Fix `notebook-runner.ts` to remove `SqlAgent` references (disable NL mode temporarily)
- NL-to-SQL mode will be disabled until `SqlAgent` is re-implemented
- REPL state is ephemeral (not persisted between sessions, except command history)
- Can still use command-line mode: `qwery datasource list` works as before
- Design inspired by [Cursor CLI](https://cursor.com/cli) - conversational, minimal, AI-powered

## Key Differences from Traditional CLI
- No complex command structure - just type queries
- Empty input allowed (shows prompt again)
- Context shown in prompt (`qwery [datasource]>`)
- Commands prefixed with `/` to distinguish from queries
- Results appear inline, formatted cleanly

