# Agent loop

User input → LLM ↔ tools ↔ local execution → user output.
Tools are listed in ADR #28.

```mermaid
sequenceDiagram
  autonumber
  actor User
  participant TUI as Ink TUI
  participant Loop as Agent loop<br/>(streamText)
  participant LLM as LLM (AI SDK)
  participant Tools as Tools<br/>(schema, runQuery, describeQuery, present)
  participant Duck as DuckDB

  User->>TUI: types prompt
  TUI->>Loop: messages
  Loop->>LLM: stream request + tool defs

  rect rgba(127,255,127,0.08)
    note right of LLM: turn 1 — discovery
    LLM-->>Loop: tool-call: schema("data/sales.csv")
    Loop->>Tools: schema(target)
    Tools->>Duck: PREPARE SELECT * FROM ...
    Duck-->>Tools: columns + types (no rows)
    Tools-->>Loop: { ok, columns }
    Loop-->>LLM: tool result (metadata only)
  end

  rect rgba(127,127,255,0.08)
    note right of LLM: turn 2 — synthesis (privacy-safe)
    LLM-->>Loop: tool-call: present(sql, "{{table}}")
    Loop->>Tools: present(sql, template)
    Tools->>Duck: runSql(sql)
    Duck-->>Tools: rows (local only)
    Tools->>Tools: renderTemplate(rows, template)
    Tools-->>TUI: rendered output + QueryResult
    Tools-->>Loop: { ok, rowCount }
    Loop-->>LLM: { ok, rowCount }
  end

  LLM-->>Loop: final text (no row values)
  Loop-->>TUI: stream text deltas
  TUI-->>User: chat + Results pane
```
