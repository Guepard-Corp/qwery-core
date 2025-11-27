# Text-to-SQL Integration Plan

## Phase 1: Schema Cache Infrastructure (Week 1)

### Step 1.1: Create Schema Cache Ports
**Location**: `packages/agent-factory-sdk/src/ports/schema-cache.port.ts`

```typescript
export interface SchemaCacheEntry {
  datasourceId: string;
  schema: SimpleSchema;
  version: string; // MD5 hash of schema structure
  cachedAt: Date;
  expiresAt: Date;
  metadata?: {
    tableCount: number;
    lastModified?: Date;
  };
}

export interface ISchemaCache {
  get(datasourceId: string): Promise<SchemaCacheEntry | null>;
  set(entry: SchemaCacheEntry): Promise<void>;
  invalidate(datasourceId: string): Promise<void>;
  checkFreshness(datasourceId: string, metadata: { tableCount: number }): Promise<boolean>;
}
```

### Step 1.2: Implement Schema Cache Service
**Location**: `packages/agent-factory-sdk/src/services/schema-cache/schema-cache.service.ts`

- Implement L1 (in-memory Map) cache
- Implement L2 (IndexedDB) cache using `@qwery/repositories/indexed-db`
- Add TTL management (5min L1, 1hr L2)
- Implement versioning with MD5 hashing

### Step 1.3: Create Schema Freshness Checker
**Location**: `packages/agent-factory-sdk/src/services/schema-cache/schema-freshness-checker.ts`

- Lightweight metadata query (table count, row count estimate)
- Compare with cached metadata
- Return boolean: fresh/stale

**Dependencies**: Extensions SDK (to get driver for metadata queries)

## Phase 2: Schema Extraction Service (Week 1-2)

### Step 2.1: Create Schema Extractor Port
**Location**: `packages/agent-factory-sdk/src/ports/schema-extractor.port.ts`

```typescript
export interface ISchemaExtractor {
  extract(datasourceId: string, config: Record<string, unknown>): Promise<SimpleSchema>;
  extractWithSamples(datasourceId: string, config: Record<string, unknown>, sampleSize?: number): Promise<SimpleSchema & { samples?: Record<string, unknown[]> }>;
}
```

### Step 2.2: Implement Multi-Provider Schema Extractor
**Location**: `packages/agent-factory-sdk/src/services/schema-extraction/multi-provider-schema-extractor.ts`

- Resolve extension via `getExtension(datasourceId)`
- Get driver via `extension.getDriver()`
- Call `driver.getCurrentSchema()`
- Handle provider-specific schema formats

### Step 2.3: Create Schema Normalizer
**Location**: `packages/agent-factory-sdk/src/services/schema-extraction/schema-normalizer.ts`

- Convert provider schemas to `SimpleSchema` format
- Handle type mapping (provider types → standard types)
- Preserve metadata (nullable, primary key, etc.)

### Step 2.4: Create Schema Enricher (Optional)
**Location**: `packages/agent-factory-sdk/src/services/schema-extraction/schema-enricher.ts`

- Fetch sample rows (LIMIT 5) for each table
- Add column statistics (min, max, distinct count)
- Cache samples separately (shorter TTL: 15min)

## Phase 3: Query Engine & Optimizer (Week 2)

### Step 3.1: Create Query Engine Ports
**Location**: `packages/agent-factory-sdk/src/ports/query-engine.port.ts`

```typescript
export interface IQueryEngine {
  execute(query: string, datasourceId: string, config: Record<string, unknown>): Promise<DatasourceResultSet>;
  validate(query: string, schema: SimpleSchema): Promise<{ valid: boolean; errors?: string[] }>;
}

export interface IQueryEngineSelector {
  select(datasource: Datasource, query: string): Promise<IQueryEngine>;
}
```

### Step 3.2: Implement Query Engine Selector
**Location**: `packages/agent-factory-sdk/src/services/query-engine/query-engine-selector.ts`

- Analyze datasource type (`DatasourceKind.EMBEDDED` → DuckDB)
- Analyze query complexity (joins, subqueries, aggregations)
- Route to appropriate engine
- Register engines: `DuckDBEngine`, `DirectDriverEngine`, `TranslationEngine`

### Step 3.3: Create Query Validator
**Location**: `packages/agent-factory-sdk/src/services/query-optimizer/query-validator.ts`

- SQL syntax validation (use SQL parser library)
- Schema compatibility check (table/column names exist)
- Type checking (column types match operations)

### Step 3.4: Create Query Optimizer
**Location**: `packages/agent-factory-sdk/src/services/query-optimizer/query-optimizer.ts`

- Add `LIMIT` to `SELECT *` queries (default: 1000)
- Rewrite inefficient patterns
- Add index hints (if schema metadata available)
- Validate against cached schema

### Step 3.5: Create Query Safety Checker
**Location**: `packages/agent-factory-sdk/src/services/query-optimizer/query-safety-checker.ts`

- Block `DROP`, `TRUNCATE`, `DELETE` without `WHERE`
- Require explicit confirmation for destructive operations
- Whitelist safe operations: `SELECT`, `EXPLAIN`, `DESCRIBE`

## Phase 4: Text-to-SQL Agent Actor (Week 3)

### Step 4.1: Add Intent to INTENTS_LIST
**Location**: `packages/agent-factory-sdk/src/agents/types/index.ts`

```typescript
{
  name: 'text-to-sql',
  description: 'When the user wants to query data using natural language',
  supported: true,
  destructive: false,
}
```

### Step 4.2: Create Text-to-SQL Prompt
**Location**: `packages/agent-factory-sdk/src/agents/prompts/text-to-sql-agent.prompt.ts`

- Include schema context (tables, columns, types, samples)
- Include query examples
- Specify SQL dialect (based on datasource)
- Add safety constraints

### Step 4.3: Create Text-to-SQL Actor
**Location**: `packages/agent-factory-sdk/src/agents/actors/text-to-sql-agent.actor.ts`

**Tools to Register**:
1. `getOrFetchSchema`: Gets schema from cache or extracts fresh
2. `generateSQL`: LLM generates SQL (via `streamText` with schema context)
3. `validateAndOptimizeQuery`: Validates and optimizes generated SQL
4. `executeQuery`: Executes query via selected engine
5. `formatResults`: Formats results for display

**Actor Structure**:
```typescript
export const textToSqlAgentActor = fromPromise(async ({ input }) => {
  const agent = new TextToSqlAgent({
    conversationId: input.conversationId,
    datasourceId: input.datasourceId,
  });
  return agent.getAgent().stream({ prompt: input.inputMessage });
});
```

### Step 4.4: Create TextToSqlAgent Class
**Location**: `packages/agent-factory-sdk/src/agents/actors/text-to-sql-agent.actor.ts`

- Similar structure to `ReadDataAgent`
- Uses `Experimental_Agent` with tools
- Integrates schema cache, extractor, optimizer services
- Handles error recovery (retry with fixes)

## Phase 5: State Machine Integration (Week 3)

### Step 5.1: Update State Machine
**Location**: `packages/agent-factory-sdk/src/agents/state-machine.ts`

**Add**:
1. Import `textToSqlAgentActor`
2. Register in `actors` setup
3. Add guard: `isTextToSql`
4. Add transition in `detectIntent.onDone`
5. Add `textToSql` state in `running.states`

**State Definition**:
```typescript
textToSql: {
  invoke: {
    src: 'textToSqlAgentActor',
    id: 'TEXT_TO_SQL',
    input: ({ context }) => ({
      inputMessage: context.inputMessage,
      conversationId: context.conversationId,
      datasourceId: context.datasourceId, // Extract from intent or context
    }),
    onDone: {
      target: '#factory-agent.idle',
      actions: assign({
        streamResult: ({ event }) => event.output,
      }),
    },
    onError: {
      target: '#factory-agent.idle',
    },
  },
},
```

### Step 5.2: Update Intent Detection Prompt
**Location**: `packages/agent-factory-sdk/src/agents/prompts/detect-intent.prompt.ts`

- Add examples for text-to-SQL intent
- Include datasource context in detection

## Phase 6: API Integration (Week 4)

### Step 6.1: Update Chat API Route
**Location**: `apps/web/app/routes/api/chat.ts`

- Ensure `FactoryAgent` handles `text-to-sql` intent
- Pass datasource context if available in conversation

### Step 6.2: Create Text-to-SQL Hook (Optional)
**Location**: `apps/web/lib/hooks/use-text-to-sql.ts`

- React hook for text-to-SQL operations
- Integrates with chat API
- Handles loading/error states

## Phase 7: Testing & Optimization (Week 4-5)

### Step 7.1: Unit Tests
- Schema cache service (L1/L2 cache, TTL, invalidation)
- Schema extractor (multi-provider, normalization)
- Query validator/optimizer (syntax, safety, optimizations)
- Text-to-SQL agent (tool execution, error handling)

### Step 7.2: Integration Tests
- End-to-end text-to-SQL flow
- Schema caching and freshness checks
- Multi-provider support
- Error recovery scenarios

### Step 7.3: Performance Testing
- Cache hit rates
- Schema extraction latency
- SQL generation latency
- Query execution performance

### Step 7.4: Benchmarking
- Test against WikiSQL/Spider datasets (if applicable)
- Measure accuracy (SQL correctness)
- Measure latency (end-to-end)

## Phase 8: Documentation & Polish (Week 5)

### Step 8.1: Update AGENTS.md
- Document text-to-SQL intent
- Add usage examples
- Document schema caching behavior

### Step 8.2: Create User Guide
- How to use text-to-SQL
- Supported datasources
- Query limitations
- Error handling

## Implementation Order Summary

1. **Week 1**: Schema cache infrastructure (ports, services, freshness checker)
2. **Week 2**: Schema extraction (multi-provider, normalizer, enricher) + Query engine/optimizer
3. **Week 3**: Text-to-SQL agent actor + State machine integration
4. **Week 4**: API integration + Testing
5. **Week 5**: Performance optimization + Documentation

## Dependencies

- `@qwery/extensions-sdk`: Provider resolution, driver access
- `@qwery/domain/entities`: `SimpleSchema`, `Datasource` types
- `@qwery/repositories/indexed-db`: L2 cache storage
- `ai` SDK: `Experimental_Agent`, `streamText`
- `xstate`: State machine orchestration
- SQL parser library (e.g., `node-sql-parser` or `@databases/sql`)

## Configuration

Add to environment variables:
- `SCHEMA_CACHE_TTL_L1`: L1 cache TTL in ms (default: 300000 = 5min)
- `SCHEMA_CACHE_TTL_L2`: L2 cache TTL in ms (default: 3600000 = 1hr)
- `SCHEMA_FRESHNESS_CHECK_ENABLED`: Enable freshness checks (default: true)
- `QUERY_SAFETY_STRICT_MODE`: Block all destructive operations (default: true)
- `QUERY_DEFAULT_LIMIT`: Default LIMIT for SELECT * (default: 1000)


