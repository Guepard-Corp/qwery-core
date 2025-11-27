# Text-to-SQL Agent Architecture

## Overview

This document outlines the architecture for a production-grade text-to-SQL agent that integrates with the existing agent factory system. The architecture follows clean architecture principles, implements schema caching with freshness checks, supports multiple datasource providers, and includes query optimization.

## Architecture Components

### 1. **Schema Cache Layer** (`packages/agent-factory-sdk/src/services/schema-cache/`)

**Purpose**: Fast schema retrieval with intelligent caching and freshness validation.

**Components**:
- `SchemaCachePort`: Interface for schema storage/retrieval
- `SchemaCacheService`: In-memory + persistent cache with TTL
- `SchemaFreshnessChecker`: Validates schema staleness across providers
- `SchemaVersionManager`: Tracks schema versions per datasource

**Cache Strategy**:
- **L1 Cache**: In-memory Map (conversation-scoped, expires after 5min)
- **L2 Cache**: IndexedDB (persistent, expires after 1hr)
- **Freshness Check**: Lightweight metadata query (table count, last modified timestamp)
- **Versioning**: Hash-based schema versioning (MD5 of schema structure)

### 2. **Schema Extraction Service** (`packages/agent-factory-sdk/src/services/schema-extraction/`)

**Purpose**: Provider-agnostic schema extraction via extensions-sdk.

**Components**:
- `SchemaExtractorPort`: Interface for schema extraction
- `MultiProviderSchemaExtractor`: Routes to provider-specific extractors
- `SchemaNormalizer`: Converts provider schemas to `SimpleSchema` format
- `SchemaEnricher`: Adds metadata (sample data, constraints, indexes)

**Flow**:
1. Resolve datasource via `extensions-sdk` registry
2. Get driver via `extension.getDriver()`
3. Call `driver.getCurrentSchema()`
4. Normalize to `SimpleSchema`
5. Enrich with samples (optional, for better LLM context)

### 3. **Query Engine Selector** (`packages/agent-factory-sdk/src/services/query-engine/`)

**Purpose**: Intelligent query engine selection based on datasource type and query complexity.

**Components**:
- `QueryEnginePort`: Interface for query execution
- `QueryEngineSelector`: Chooses optimal engine (DuckDB, PostgreSQL, etc.)
- `QueryEngineRegistry`: Maps datasource types to engines
- `QueryComplexityAnalyzer`: Analyzes query complexity (joins, subqueries, aggregations)

**Engine Selection Logic**:
- **Embedded datasources**: DuckDB (fast, in-memory)
- **Remote SQL**: Direct connection via driver
- **NoSQL**: Query translation layer (if needed)
- **Complex queries**: Route to optimized engine (e.g., DuckDB for analytics)

### 4. **Query Optimizer** (`packages/agent-factory-sdk/src/services/query-optimizer/`)

**Purpose**: Validates and optimizes generated SQL queries.

**Components**:
- `QueryValidator`: Syntax validation, schema compatibility
- `QueryOptimizer`: Adds indexes hints, rewrites inefficient patterns
- `QuerySafetyChecker`: Prevents destructive operations (DROP, DELETE without WHERE)
- `QueryExplainer`: Generates execution plan for debugging

**Optimization Rules**:
- Add `LIMIT` to SELECT * queries (default: 1000)
- Rewrite `SELECT DISTINCT` with large result sets
- Add index hints for known slow columns
- Validate table/column names against cached schema

### 5. **Text-to-SQL Agent** (`packages/agent-factory-sdk/src/agents/actors/text-to-sql-agent.actor.ts`)

**Purpose**: Main agent orchestrating the text-to-SQL pipeline.

**State Machine Flow**:
1. **ParseIntent**: Extract datasource ID and natural language query
2. **GetOrFetchSchema**: Check cache → validate freshness → extract if stale
3. **GenerateSQL**: LLM generates SQL with schema context
4. **ValidateQuery**: Syntax + safety validation
5. **OptimizeQuery**: Apply optimizations
6. **SelectEngine**: Choose execution engine
7. **ExecuteQuery**: Run query via selected engine
8. **FormatResults**: Format results for user

## State Machine Graph

See mermaid diagram below for XState-compatible state transitions.

## Integration Points

### With Extensions SDK
- Uses `getExtension()` to resolve datasource providers
- Calls `extension.getDriver()` for schema extraction
- Leverages `DatasourceDriver` interface for query execution

### With Agent Factory
- Registers as new intent: `text-to-sql`
- Integrates with existing `AgentFactory` for model resolution
- Uses `Experimental_Agent` for tool orchestration

### With Domain Layer
- Uses `SimpleSchema` type from `@qwery/domain/entities`
- Integrates with `Datasource` entity
- Stores cache metadata in workspace context

## Performance Targets

- **Schema Cache Hit**: < 10ms
- **Schema Freshness Check**: < 100ms (lightweight metadata query)
- **Schema Extraction**: < 2s (provider-dependent)
- **SQL Generation**: < 3s (LLM-dependent)
- **Query Execution**: Variable (depends on query complexity)

## Error Handling

- **Schema Extraction Failure**: Fallback to cached schema with warning
- **SQL Generation Failure**: Retry with simplified prompt
- **Query Execution Failure**: Return error with suggested fixes
- **Cache Corruption**: Invalidate and re-extract

## Security Considerations

- **Query Safety**: Block destructive operations without explicit confirmation
- **Schema Access**: Validate datasource permissions
- **Cache Isolation**: Per-user, per-project cache keys
- **Input Sanitization**: Prevent SQL injection in generated queries


