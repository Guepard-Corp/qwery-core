# Compute SDK

Unified abstraction for executing queries across Browser, Local, and Cloud compute backends.



## What is Compute SDK?

Compute SDK provides a single interface to execute queries regardless of where they run. Instead of handling browser vs node vs cloud execution separately, you use one API and the SDK routes to the right backend automatically.

## The Problem It Solves

**Before:** Different code paths for different execution contexts
- Agents used DuckDBQueryEngine directly
- Notebooks checked runtime and called different APIs
- No way to switch backends without code changes
- Inconsistent metrics and error handling

**After:** Single interface for all execution
- One API for all backends
- Automatic backend selection via configuration
- Consistent metrics and error handling
- Easy to add new backends

## Three Backends Explained

### Browser Backend
**What it is:** Executes queries in the user's browser using WASM or JavaScript

**When to use:**
- Embedded datasources (DuckDB WASM, PGlite)
- Small to medium queries
- Privacy-sensitive data (stays in browser)
- No server needed

**How it works:**
- Loads extensions from `/public/extensions/` directory
- Runs queries directly in browser
- Results returned immediately
- Limited by browser memory (~100-500MB)

**Example use cases:**
- User exploring local CSV files
- Small PostgreSQL queries via browser driver
- DuckDB WASM queries

### Local Backend
**What it is:** Executes queries on the local machine using Node.js

**When to use:**
- CLI applications
- Development and testing
- Direct database connections
- Large queries needing more resources

**How it works:**
- Loads extensions from `node_modules`
- Runs queries in Node.js process
- Full access to machine resources
- No network latency

**Example use cases:**
- CLI tool querying production databases
- Local development with large datasets
- Testing queries before deploying

### Cloud Backend (Nomad)
**What it is:** Executes queries in cloud infrastructure via Nomad jobs

**When to use:**
- Production workloads
- Scalable compute needs
- Isolated execution environments
- Resource-intensive queries

**How it works:**
- Packages extension code into Nomad job
- Submits job to Nomad cluster
- Job runs on compute nodes
- Retrieves results from job logs
- 1-5 second startup time, scales infinitely

**Example use cases:**
- Large analytical queries
- Multi-datasource federated queries
- Production notebook execution
- Scheduled query jobs

```mermaid
flowchart TD
    subgraph "Nomad Backend Flow"
        NB[NomadBackend.execute]
        AS[Determine Attachment Strategy]
        JS[Build Job Spec]
        NS[Submit to Nomad API]
    end
    
    subgraph "Nomad Cluster"
        NC[Nomad Cluster]
        JQ[Job Queue]
        CN[Compute Node]
        JOB[Nomad Job]
    end
    
    subgraph "Job Execution"
        EL[Extension Loader]
        DR[Driver Execution]
        QR[Query Result]
    end
    
    subgraph "Result Retrieval"
        PS[Poll Job Status]
        RL[Retrieve Logs]
        PR[Parse Result]
    end
    
    NB --> AS
    AS --> JS
    JS --> NS
    NS --> NC
    
    NC --> JQ
    JQ --> CN
    CN --> JOB
    
    JOB --> EL
    EL --> DR
    DR --> QR
    
    QR --> PS
    PS --> RL
    RL --> PR
    PR --> NB
    
    style NB fill:#FF9800
    style NC fill:#2196F3
    style JOB fill:#4CAF50
    style PR fill:#9C27B0
```

## How Backend Selection Works

The SDK selects backends in this priority order:

1. **Feature Flag** (highest priority) - For testing/overrides
2. **Environment Variable** (`COMPUTE_RUNTIME`) - For deployment control
3. **User Plan** - Free users get Browser/Local, Pro gets Cloud access
4. **Default** - Falls back to Local

You can override at any level, making it easy to test different backends.

```mermaid
flowchart TD
    START[Query Request] --> FF{Feature Flag<br/>Set?}
    
    FF -->|Yes| FF_BACKEND[Use Flag Backend]
    FF -->|No| ENV{Environment Var<br/>COMPUTE_RUNTIME?}
    
    ENV -->|Yes| ENV_BACKEND[Use Env Backend]
    ENV -->|No| PLAN{User Plan<br/>Check}
    
    PLAN -->|Free| FREE_BACKEND[Browser or Local]
    PLAN -->|Pro| PRO_BACKEND[Local or Cloud]
    PLAN -->|Enterprise| ENTERPRISE_BACKEND[Any Backend]
    
    FREE_BACKEND --> CHECK_AVAIL{Backend<br/>Available?}
    PRO_BACKEND --> CHECK_AVAIL
    ENTERPRISE_BACKEND --> CHECK_AVAIL
    FF_BACKEND --> CHECK_AVAIL
    ENV_BACKEND --> CHECK_AVAIL
    
    CHECK_AVAIL -->|Yes| EXECUTE[Execute Query]
    CHECK_AVAIL -->|No| FALLBACK[Try Fallback Backend]
    FALLBACK --> EXECUTE
    
    style START fill:#4CAF50
    style EXECUTE fill:#2196F3
    style CHECK_AVAIL fill:#FF9800
```

## Extension Loading

Extensions are loaded differently based on runtime:

**Browser:** Extensions bundled for browser, loaded from `/public/extensions/` via dynamic imports

**Node:** Extensions loaded from `node_modules` using standard Node.js module resolution

**Nomad:** Extensions packaged into the job artifact, loaded when job starts

The SDK handles all of this automatically - you don't need to think about it.

```mermaid
flowchart TD
    subgraph "Extension Loading"
        EL[ExtensionLoader]
        DS[Datasource Provider]
    end
    
    subgraph "Runtime Detection"
        RD{Runtime<br/>Type?}
    end
    
    subgraph "Browser Runtime"
        BE[Load from<br/>/public/extensions/]
        DI[Dynamic Import<br/>via URL]
        BD[Browser Driver]
    end
    
    subgraph "Node Runtime"
        NE[Load from<br/>node_modules]
        SI[Static Import<br/>Node.js]
        ND[Node Driver]
    end
    
    subgraph "Nomad Runtime"
        PE[Package in<br/>Job Artifact]
        JE[Load in<br/>Job Script]
        NOMD[Nomad Driver]
    end
    
    DS --> EL
    EL --> RD
    
    RD -->|browser| BE
    RD -->|node| NE
    RD -->|nomad| PE
    
    BE --> DI
    DI --> BD
    
    NE --> SI
    SI --> ND
    
    PE --> JE
    JE --> NOMD
    
    style EL fill:#4CAF50
    style RD fill:#FF9800
    style BD fill:#00BCD4
    style ND fill:#9C27B0
    style NOMD fill:#FF6F00
```

## Attachment Strategies

Different datasources attach to query engines differently:

**Foreign Databases** (PostgreSQL, MySQL, etc.)
- Uses DuckDB's `ATTACH` statement
- Creates connection to remote database
- Tables accessible as `databasename.schema.tablename`

**Google Sheets**
- Creates persistent SQLite database
- Fetches spreadsheet tabs and creates tables
- Requires conversationId and workspace for persistence

**ClickHouse**
- Similar to foreign databases but with ClickHouse-specific handling
- Creates views for ClickHouse tables

**Native DuckDB**
- Direct DuckDB operations
- No external connection needed
- Files attached via DuckDB native functions

The SDK automatically determines the right strategy based on datasource type.

```mermaid
flowchart TD
    subgraph "Strategy Resolution"
        DS[Datasource Provider]
        ASR[AttachmentStrategyResolver]
    end
    
    subgraph "Strategy Selection"
        CHECK{Check Provider<br/>Type}
    end
    
    subgraph "Strategies"
        GS[GSheet Strategy<br/>SQLite + Tabs]
        CH[ClickHouse Strategy<br/>Views]
        FD[Foreign Database Strategy<br/>ATTACH Statement]
        ND[DuckDB Native Strategy<br/>Direct Operations]
    end
    
    DS --> ASR
    ASR --> CHECK
    
    CHECK -->|gsheet-csv| GS
    CHECK -->|clickhouse| CH
    CHECK -->|postgresql, mysql, etc.| FD
    CHECK -->|duckdb, parquet, json| ND
    
    GS --> EXEC[Execute Attachment]
    CH --> EXEC
    FD --> EXEC
    ND --> EXEC
    
    style ASR fill:#4CAF50
    style CHECK fill:#FF9800
    style GS fill:#E91E63
    style CH fill:#9C27B0
    style FD fill:#2196F3
    style ND fill:#00BCD4
```

## Configuration

### Environment Variables

```bash
# Select compute backend
COMPUTE_RUNTIME=browser|local|nomad

# Nomad configuration (when using nomad backend)
NOMAD_ADDR=10.0.4.10:4646
NOMAD_TOKEN=your-token-here
NOMAD_DC=us-west-aws
NOMAD_NODE_POOL=us-west-aws
```

### Runtime Selection

Set `COMPUTE_RUNTIME` before creating ComputeManager. The SDK uses this to route queries to the correct backend.

## Usage

Create a ComputeManager and call `execute()` with your query and datasource. The SDK handles everything else:

- Backend selection
- Extension loading
- Attachment strategy
- Error handling
- Metrics collection

Results are always in the same format regardless of backend.

### Query Execution Flow

```mermaid
sequenceDiagram
    participant App as Application
    participant CM as ComputeManager
    participant BR as BackendRouter
    participant BE as Selected Backend
    participant EL as ExtensionLoader
    participant AS as AttachmentStrategy
    participant MC as MetricsCollector
    
    App->>CM: execute(query, datasource, context)
    CM->>BR: selectBackend(context)
    BR->>BR: checkFeatureFlag()
    BR->>BR: checkEnvVar()
    BR->>BR: checkUserPlan()
    BR-->>CM: selectedBackend
    
    CM->>MC: startTracking()
    CM->>BE: execute(query, datasource)
    
    BE->>EL: loadExtension(provider, runtime)
    EL-->>BE: extension
    
    BE->>AS: resolveStrategy(datasource)
    AS-->>BE: strategy
    
    BE->>BE: execute query
    BE-->>CM: result + metrics
    
    CM->>MC: recordMetrics(metrics)
    MC->>MC: send to OTel & Usage Repo
    CM-->>App: QueryResult
```

## Integration Points

**Agents:** Replace direct DuckDBQueryEngine calls with ComputeManager

**Notebooks:** Replace manual runtime checking with ComputeManager

**QueryEngine:** Use ComputeManager for federated queries, direct DuckDB for simple queries

**CLI:** Replace direct driver calls with ComputeManager

All integrations use the same API, making code consistent across the codebase.

## Metrics & Billing

The SDK automatically tracks:
- Execution time per backend
- Rows processed
- Memory usage (where available)
- Cost estimates (for cloud backends)

Metrics go to:
- OpenTelemetry for observability
- Usage Repository for billing

No manual tracking needed.

## Error Handling

The SDK handles errors consistently:
- Backend unavailable → tries fallback backends
- Extension not found → clear error message
- Query failed → structured error with context
- Network errors → automatic retries (for cloud backends)

All errors include context about which backend and datasource were used.

## Architecture Overview

```mermaid
flowchart TD
    subgraph "Applications"
        AG[Agents]
        NB[Notebooks]
        QE[QueryEngine]
    end
    
    subgraph "Compute SDK"
        CM[ComputeManager<br/>Single Entry Point]
        BR[BackendRouter<br/>Selects Backend]
    end
    
    subgraph "Backends"
        BB[Browser Backend<br/>WASM/JavaScript]
        LB[Local Backend<br/>Node.js]
        CB[Cloud Backend<br/>Nomad]
    end
    
    subgraph "Execution Layer"
        EL[ExtensionLoader<br/>Loads Based on Runtime]
        AS[AttachmentStrategyResolver<br/>Determines Strategy]
        EX[Query Execution]
    end
    
    subgraph "Observability"
        MC[Metrics Collector]
        OT[OpenTelemetry]
        UR[Usage Repository]
    end
    
    AG --> CM
    NB --> CM
    QE --> CM
    
    CM --> BR
    BR --> BB
    BR --> LB
    BR --> CB
    
    BB --> EL
    LB --> EL
    CB --> EL
    
    EL --> AS
    AS --> EX
    
    EX --> MC
    MC --> OT
    MC --> UR
    
    style CM fill:#4CAF50
    style BR fill:#2196F3
    style BB fill:#00BCD4
    style LB fill:#9C27B0
    style CB fill:#FF9800
```

## Key Benefits

**For Developers:**
- One API to learn
- Consistent error handling
- Easy to test different backends
- No need to understand extension loading details

**For Operations:**
- Easy to switch backends via environment variables
- Centralized metrics collection
- Consistent observability across all backends

**For Users:**
- Transparent backend selection
- Optimal performance (right backend for the job)
- Reliable execution (automatic fallbacks)

## Future Backends

The architecture supports adding new backends easily:
- Kubernetes (container-based execution)
- Lambda (serverless functions)
- Azure Functions
- Google Cloud Functions

Each backend implements the same interface, so adding new ones doesn't require changing application code.

## Summary

Compute SDK abstracts away the complexity of executing queries across different environments. You write code once, configure the backend via environment variables, and the SDK handles routing, extension loading, attachment strategies, and metrics collection automatically.

Whether your query runs in a browser, on a local machine, or in the cloud, the API and results are identical. This makes the codebase simpler, more maintainable, and easier to extend.
