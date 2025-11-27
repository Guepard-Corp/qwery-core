# Text-to-SQL Architecture - Quick Reference

## Overview

Production-grade text-to-SQL agent with:
- ✅ Schema caching (L1 memory + L2 IndexedDB) with freshness checks
- ✅ Multi-provider support via extensions-sdk
- ✅ Query engine selection (DuckDB, direct driver, etc.)
- ✅ Query optimization and safety validation
- ✅ Clean architecture (ports/adapters pattern)
- ✅ XState state machine integration

## Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│              Text-to-SQL Agent Actor                    │
│         (Experimental_Agent with tools)                 │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Schema Cache │  │ Query Engine │  │   Query      │
│   Service    │  │   Selector   │  │  Optimizer   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Schema     │  │  Extensions  │  │   Datasource │
│  Extractor   │  │     SDK      │  │    Driver    │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Key Components

### 1. Schema Cache (`services/schema-cache/`)
- **L1 Cache**: In-memory Map (5min TTL)
- **L2 Cache**: IndexedDB (1hr TTL)
- **Freshness Check**: Lightweight metadata query (< 100ms)
- **Versioning**: MD5 hash of schema structure

### 2. Schema Extraction (`services/schema-extraction/`)
- **Multi-Provider**: Routes via extensions-sdk
- **Normalization**: Converts to `SimpleSchema` format
- **Enrichment**: Optional sample data for better LLM context

### 3. Query Engine (`services/query-engine/`)
- **Selector**: Chooses engine based on datasource type + query complexity
- **Engines**: DuckDB (embedded), Direct Driver (remote SQL), Translation (NoSQL)

### 4. Query Optimizer (`services/query-optimizer/`)
- **Validator**: Syntax + schema compatibility
- **Optimizer**: Adds LIMIT, index hints, rewrites inefficient patterns
- **Safety**: Blocks destructive operations

## State Machine Flow

```
idle → running.parseIntent
     → running.getOrFetchSchema
       → checkCache → [cacheHit | extractSchema]
     → running.generateSQL
     → running.validateQuery
     → running.optimizeQuery
     → running.selectEngine
     → running.executeQuery
     → running.formatResults
     → idle
```

## Integration Steps

1. **Add Intent**: `text-to-sql` to `INTENTS_LIST`
2. **Create Actor**: `text-to-sql-agent.actor.ts` with tools
3. **Update State Machine**: Register actor, add guard, add state
4. **Implement Services**: Schema cache, extractor, optimizer
5. **Test**: Unit + integration tests

## Files to Create

```
packages/agent-factory-sdk/src/
├── ports/
│   ├── schema-cache.port.ts
│   ├── schema-extractor.port.ts
│   └── query-engine.port.ts
├── services/
│   ├── schema-cache/
│   │   ├── schema-cache.service.ts
│   │   └── schema-freshness-checker.ts
│   ├── schema-extraction/
│   │   ├── multi-provider-schema-extractor.ts
│   │   ├── schema-normalizer.ts
│   │   └── schema-enricher.ts
│   ├── query-engine/
│   │   ├── query-engine-selector.ts
│   │   └── duckdb-engine.ts
│   └── query-optimizer/
│       ├── query-validator.ts
│       ├── query-optimizer.ts
│       └── query-safety-checker.ts
└── agents/
    ├── actors/
    │   └── text-to-sql-agent.actor.ts
    └── prompts/
        └── text-to-sql-agent.prompt.ts
```

## Performance Targets

- Schema cache hit: < 10ms
- Schema freshness check: < 100ms
- Schema extraction: < 2s
- SQL generation: < 3s
- Query execution: Variable

## Configuration

```env
SCHEMA_CACHE_TTL_L1=300000          # 5min
SCHEMA_CACHE_TTL_L2=3600000         # 1hr
SCHEMA_FRESHNESS_CHECK_ENABLED=true
QUERY_SAFETY_STRICT_MODE=true
QUERY_DEFAULT_LIMIT=1000
```

## Next Steps

1. Review architecture document: `005_text_to_sql_architecture.md`
2. Review state diagram: `005_text_to_sql_state_diagram.md`
3. Follow integration plan: `005_text_to_sql_integration_plan.md`
4. Start with Phase 1: Schema Cache Infrastructure


