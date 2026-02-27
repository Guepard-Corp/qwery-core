# Agent Factory Decision Flow

## Main State Machine Flow

```mermaid
flowchart TD
    Start([FactoryAgent Created]) --> LoadContext[loadContext State]
    
    LoadContext --> LoadContextActor[loadContextActor]
    LoadContextActor -->|Load Previous Messages| LoadContextDone{Load Success?}
    LoadContextDone -->|Success| Idle[idle State]
    LoadContextDone -->|Error| Idle
    
    Idle -->|USER_INPUT Event| Running[running State]
    Idle -->|STOP Event| Stopped[stopped State - Final]
    
    Running --> DetectIntent[detectIntent Sub-state]
    
    DetectIntent --> DetectIntentActor[detectIntentActor]
    DetectIntentActor -->|LLM Classifies Intent| IntentResult{Intent Type?}
    
    IntentResult -->|intent === 'greeting'| Greeting[greeting Sub-state]
    IntentResult -->|intent === 'read-data'| ReadData[readData Sub-state]
    IntentResult -->|intent === 'other'| SummarizeIntent[summarizeIntent Sub-state]
    IntentResult -->|Error| Idle
    
    Greeting --> GreetingActor[greetingActor]
    GreetingActor -->|Stream Response| Streaming[streaming Sub-state]
    GreetingActor -->|Error| Idle
    
    ReadData --> ReadDataActor[readDataAgentActor]
    ReadDataActor -->|Agent with Tools| Streaming
    ReadDataActor -->|Error| Idle
    
    SummarizeIntent --> SummarizeActor[summarizeIntentActor]
    SummarizeActor -->|Stream Response| Streaming
    SummarizeActor -->|Error| Idle
    
    Streaming -->|FINISH_STREAM Event| Idle
    Streaming -->|USER_INPUT Event| Running
    
    Running -->|USER_INPUT Event| Running
    Running -->|STOP Event| Idle
    
    style Start fill:#e1f5ff
    style Idle fill:#fff4e1
    style Running fill:#ffe1f5
    style DetectIntent fill:#e1ffe1
    style Greeting fill:#f0e1ff
    style ReadData fill:#ffe1e1
    style SummarizeIntent fill:#e1ffff
    style Streaming fill:#ffffe1
    style Stopped fill:#ffcccc
```

## Read Data Agent Tools & Services

```mermaid
flowchart TD
    ReadDataAgent[readDataAgentActor<br/>Agent with LLM] --> Tools[Available Tools]
    
    Tools --> TestConnection[testConnection Tool]
    Tools --> CreateView[createDbViewFromSheet Tool]
    Tools --> ListViews[listViews Tool]
    Tools --> GetSchema[getSchema Tool]
    Tools --> RunQuery[runQuery Tool]
    
    TestConnection --> TestConnFunc[test-connection.ts<br/>DuckDB Connection Test]
    
    CreateView --> RegisterView[view-registry.ts<br/>registerSheetView]
    CreateView --> GSheetToDB[gsheet-to-duckdb.ts<br/>Create DuckDB View from CSV]
    CreateView --> ExtractSchema[extract-schema.ts<br/>Extract Schema]
    CreateView --> BusinessContext[business-context.service.ts<br/>analyzeSchemaAndUpdateContext]
    
    ListViews --> LoadRegistry[view-registry.ts<br/>loadViewRegistry]
    
    GetSchema --> ExtractSchema
    GetSchema --> LoadBusinessCtx[business-context.service.ts<br/>loadBusinessContext]
    GetSchema --> BusinessContext
    
    RunQuery --> RunQueryFunc[run-query.ts<br/>Execute SQL Query]
    RunQuery --> UpdateUsage[view-registry.ts<br/>updateViewUsage]
    
    style ReadDataAgent fill:#ffe1e1
    style Tools fill:#e1ffe1
    style TestConnection fill:#f0e1ff
    style CreateView fill:#f0e1ff
    style ListViews fill:#f0e1ff
    style GetSchema fill:#f0e1ff
    style RunQuery fill:#f0e1ff
    style TestConnFunc fill:#ffffe1
    style GSheetToDB fill:#ffffe1
    style ExtractSchema fill:#ffffe1
    style RunQueryFunc fill:#ffffe1
    style RegisterView fill:#e1ffff
    style LoadRegistry fill:#e1ffff
    style UpdateUsage fill:#e1ffff
    style BusinessContext fill:#e1ffff
    style LoadBusinessCtx fill:#e1ffff
```

## Complete Actor & Tool Architecture

```mermaid
graph TB
    subgraph "State Machine Actors"
        LoadContextActor[loadContextActor<br/>Load conversation history]
        DetectIntentActor[detectIntentActor<br/>Classify user intent]
        GreetingActor[greetingActor<br/>Generate greeting]
        ReadDataActor[readDataAgentActor<br/>Agent with tools]
        SummarizeActor[summarizeIntentActor<br/>General response]
    end
    
    subgraph "Read Data Agent Tools"
        Tool1[testConnection<br/>Test DB connection]
        Tool2[createDbViewFromSheet<br/>Create view from Google Sheet]
        Tool3[listViews<br/>List all views]
        Tool4[getSchema<br/>Get schema + business context]
        Tool5[runQuery<br/>Execute SQL query]
    end
    
    subgraph "Underlying Functions"
        Func1[test-connection.ts]
        Func2[gsheet-to-duckdb.ts]
        Func3[extract-schema.ts]
        Func4[run-query.ts]
        Func5[view-registry.ts<br/>registerSheetView<br/>loadViewRegistry<br/>updateViewUsage]
    end
    
    subgraph "Services"
        Service1[business-context.service.ts<br/>analyzeSchemaAndUpdateContext<br/>loadBusinessContext<br/>saveBusinessContext]
        Service2[message-persistence.service.ts<br/>Persist messages]
    end
    
    ReadDataActor --> Tool1
    ReadDataActor --> Tool2
    ReadDataActor --> Tool3
    ReadDataActor --> Tool4
    ReadDataActor --> Tool5
    
    Tool1 --> Func1
    Tool2 --> Func2
    Tool2 --> Func5
    Tool2 --> Func3
    Tool2 --> Service1
    Tool3 --> Func5
    Tool4 --> Func3
    Tool4 --> Service1
    Tool5 --> Func4
    Tool5 --> Func5
    
    LoadContextActor --> Service2
    
    style LoadContextActor fill:#e1f5ff
    style DetectIntentActor fill:#e1f5ff
    style GreetingActor fill:#e1f5ff
    style ReadDataActor fill:#ffe1e1
    style SummarizeActor fill:#e1f5ff
    style Tool1 fill:#f0e1ff
    style Tool2 fill:#f0e1ff
    style Tool3 fill:#f0e1ff
    style Tool4 fill:#f0e1ff
    style Tool5 fill:#f0e1ff
    style Func1 fill:#ffffe1
    style Func2 fill:#ffffe1
    style Func3 fill:#ffffe1
    style Func4 fill:#ffffe1
    style Func5 fill:#ffffe1
    style Service1 fill:#e1ffff
    style Service2 fill:#e1ffff
```

## State Machine Details

### Main States
- **loadContext**: Initial state, loads conversation history
- **idle**: Waiting for user input
- **running**: Processing user request (contains sub-states)
- **stopped**: Final state (terminated)

### Running Sub-States
- **detectIntent**: Uses LLM to classify user intent
- **greeting**: Handles greeting messages
- **readData**: Handles data reading queries with tools
- **summarizeIntent**: Handles other/general queries
- **streaming**: Streams response to client

### All Actors
- **loadContextActor**: Loads previous messages from repository using `GetMessagesByConversationIdService`
- **detectIntentActor**: Uses LLM (`azure/gpt-5.2-chat`) with `generateObject` to classify intent (greeting/read-data/other)
- **greetingActor**: Uses `streamText` with `azure/gpt-5.2-chat` to generate greeting response
- **readDataAgentActor**: Agent (`Experimental_Agent`) with 5 tools, max 20 steps, uses `azure/gpt-5.2-chat`
- **summarizeIntentActor**: Uses `streamText` with `azure/gpt-5.2-chat` to generate general response

### Read Data Agent Tools
1. **testConnection**: Tests DuckDB connection
   - Uses: `test-connection.ts` → DuckDB API

2. **createDbViewFromSheet**: Creates DuckDB view from Google Sheet
   - Uses: `view-registry.ts` (registerSheetView) → `gsheet-to-duckdb.ts` → `extract-schema.ts` → `business-context.service.ts` (analyzeSchemaAndUpdateContext)

3. **listViews**: Lists all available views
   - Uses: `view-registry.ts` (loadViewRegistry)

4. **getSchema**: Gets schema and business context
   - Uses: `extract-schema.ts` → `business-context.service.ts` (loadBusinessContext, analyzeSchemaAndUpdateContext)

5. **runQuery**: Executes SQL query
   - Uses: `run-query.ts` → `view-registry.ts` (updateViewUsage)

### Underlying Functions & Services
- **test-connection.ts**: Tests DuckDB connection
- **gsheet-to-duckdb.ts**: Converts Google Sheet CSV to DuckDB view
- **extract-schema.ts**: Extracts schema from DuckDB views
- **run-query.ts**: Executes SQL queries on DuckDB
- **view-registry.ts**: Manages view registry (registerSheetView, loadViewRegistry, updateViewUsage)
- **business-context.service.ts**: Manages business context (analyzeSchemaAndUpdateContext, loadBusinessContext, saveBusinessContext)
- **message-persistence.service.ts**: Persists messages to repository

### Events
- **USER_INPUT**: User sends a message
- **FINISH_STREAM**: Stream completed
- **STOP**: Stop processing

### Guards
- **isGreeting**: Checks if intent === 'greeting'
- **isReadData**: Checks if intent === 'read-data'
- **isOther**: Checks if intent === 'other'

