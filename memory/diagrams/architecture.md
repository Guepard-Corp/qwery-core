# Architecture — Hexagonal Map

Layers as per ADR #12 and the target layout in `AGENTS.md` §3.

```mermaid
flowchart TB
  subgraph Primary["Primary adapter"]
    CLI["apps/cli (Ink TUI)"]
  end

  subgraph App["Application"]
    UC["packages/application<br/>(use cases)"]
  end

  subgraph Domain["Domain"]
    D["packages/domain<br/>(entities, ports)"]
  end

  subgraph Adapters["Secondary adapters"]
    LLM["adapters/llm-aisdk"]
    DUCK["adapters/compute-duckdb"]
    GFS["adapters/branching-gfs"]
    INK["adapters/ui-ink"]
  end

  subgraph SDK["Extension SDK"]
    XSDK["packages/extension-sdk"]
  end

  subgraph Ext["First-party extensions"]
    EXTS["packages/extensions/{csv, json, sqlite, mysql, postgres, ...}"]
  end

  CLI --> UC
  UC --> D
  UC -.via ports.-> LLM
  UC -.via ports.-> DUCK
  UC -.via ports.-> GFS
  UC -.via ports.-> INK
  EXTS --> XSDK
  XSDK --> D
  UC -.discovers.-> EXTS

  classDef domain fill:#0e7490,stroke:#155e75,color:#fff
  classDef app fill:#0369a1,stroke:#075985,color:#fff
  classDef adapter fill:#7c3aed,stroke:#6d28d9,color:#fff
  classDef sdk fill:#15803d,stroke:#166534,color:#fff
  class D domain
  class UC app
  class LLM,DUCK,GFS,INK adapter
  class XSDK,EXTS sdk
```

**Rules** (enforced by `dependency-cruiser`):
- `domain` depends on **nothing** in this repo.
- `application` depends only on `domain`.
- `adapters/*` depend on `domain` (via ports) and external libs. Never on `application`.
- `apps/cli` depends on `application` and `adapters/*`.
- `extensions/*` depend only on `extension-sdk`, which depends only on `domain`.
