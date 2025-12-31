# PR Integration Guide: Local LLM Support (llama.cpp) & Performance Optimizations

## Overview
This PR adds **local LLM support via llama.cpp** integration alongside existing Azure OpenAI and Ollama providers, implements performance optimizations for datasource attachment, and improves error handling and timeout management across the agent factory SDK.

---

## Local LLM Used

### Primary: Llama.cpp
- **Model**: Meta Llama 3.1 8B Instruct
- **Provider**: llama.cpp (OpenAI API server)
- **Endpoint**: `http://127.0.0.1:8080/v1` (default)
- **Type**: Local, on-device inference
- **Why**: Enables fully local, privacy-preserving AI with no external API calls

---

## Instructions to Run the Solution


### 1. Install & Start llama.cpp Server

#### Windows (PowerShell)
```powershell
# Download llama-b7579-bin-win-cpu-x64 from github releases
https://github.com/ggml-org/llama.cpp/releases

# Download model from HuggingFace
# Go to: https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF
# Download: Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf (~5GB, good balance of speed/quality)

# Start server (cd into models folder where the model is located)
llama-server.exe -m models\Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf --port 8080 --host 127.0.0.1 -c 16384 -np 1 -ngl 0 --temp 0.7 --top-p 0.95
```

### 2. Verify Server is Running
```bash
curl http://127.0.0.1:8080/v1/models
```

Expected: JSON response listing available models

### 3. Install & Run Qwery
```bash
# Install dependencies
pnpm install

# Start specific app
pnpm --filter web dev
```

### 4. Configure LLM Provider

#### Via Environment Variables
```bash

# Windows (PowerShell)
$env:VITE_AGENT_PROVIDER='llamacpp'
$env:LLAMACPP_BASE_URL='http://127.0.0.1:8080/v1'
$env:LLAMACPP_MODEL='meta-llama-3.1-8b-instruct'
```

#### Via .env File
Create `.env.local` in `apps/web/`:
```bash
VITE_AGENT_PROVIDER=llamacpp
LLAMACPP_BASE_URL=http://127.0.0.1:8080/v1
LLAMACPP_MODEL=meta-llama-3.1-8b-instruct
VITE_WORKING_DIR=workspace
VITE_DATABASE_PROVIDER=sqlite
```

### 5. Use in Application
```bash
pnpm --filter web dev
```

The application will now use your local llama.cpp server instead of cloud APIs!

Model selection is determined by:
1. Environment variable `VITE_AGENT_PROVIDER`
2. Fallback to Azure if not specified
3. Default model per provider if not explicitly set

---

## How the Provider Works

### Architecture Overview

```
┌─────────────────────────────────────────┐
│  Qwery Application (React)              │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  Model Resolver                         │
│  - Determines provider (llamacpp)       │
│  - Returns LanguageModel instance       │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  LlamaCppModelProvider                  │
│  - Creates OpenAI-compatible client     │
│  - Points to local llama.cpp server     │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  HTTP Client (via @ai-sdk/openai)       │
│  - Makes requests to http://127.0.0.1   │
│  - Uses OpenAI API format               │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│  llama.cpp Server (localhost:8080)      │
│  - Loads model into VRAM                │
│  - Runs inference                       │
│  - Returns completions                  │
└─────────────────────────────────────────┘
```

### Key Implementation Details

#### 1. Provider Detection
```typescript
// In model-resolver.ts
if (providerId === 'llamacpp') {
  return createLlamaCppModelProvider({
    baseUrl: process.env.LLAMACPP_BASE_URL,
    defaultModel: process.env.LLAMACPP_MODEL,
  });
}
```

#### 2. OpenAI-Compatible Wrapper
```typescript
// In llamacpp-model.provider.ts
const openaiProvider = createOpenAI({
  baseURL: 'http://127.0.0.1:8080/v1',
  apiKey: 'not-needed', // llama.cpp doesn't require auth
  name: 'llamacpp',
});

return openaiProvider.chat(modelName);
```

#### 3. Request Flow
1. **Agent Framework** calls `resolveModel(undefined)`
2. **Model Resolver** reads `VITE_AGENT_PROVIDER=llamacpp`
3. **LlamaCppModelProvider** creates OpenAI client pointing to `http://127.0.0.1:8080/v1`
4. **AI SDK** sends JSON request in OpenAI format:
   ```json
   {
     "model": "meta-llama-3.1-8b-instruct",
     "messages": [{"role": "user", "content": "..."}],
     "temperature": 0.7
   }
   ```
5. **llama.cpp Server** processes request and returns completion
6. **AI SDK** streams response back to application

### API Compatibility

llama.cpp implements the **OpenAI API specification** at `/v1/`:

| Endpoint | Purpose |
|----------|---------|
| `POST /v1/chat/completions` | Chat API (streaming) |
| `POST /v1/completions` | Completion API |

This means any tool using OpenAI's API format works seamlessly with llama.cpp!

### Response Streaming

By default, the provider uses streaming responses for real-time output:

```typescript
const result = await streamText({
  model: await resolveModel(undefined), // Uses llama.cpp
  prompt: 'Explain quantum computing...',
});

// Stream updates arrive in real-time
for await (const chunk of result.textStream) {
  console.log(chunk); // Prints as it's generated
}
```

### Error Handling

The provider gracefully handles:
- **Connection errors**: Server unreachable
- **Timeout errors**: Long inference times (configurable)
- **Model not found**: Invalid model name
- **Server errors**: llama.cpp internal issues

Example:
```typescript
try {
  const response = await resolveModel('llamacpp/meta-llama-3.1-8b-instruct');
} catch (error) {
  // Falls back to Azure if configured
  // Or shows user-friendly error message
}
```

---

## List of Modified Files

### Core LLM Integration
- **New**: `packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts` - llama.cpp provider implementation
- **Modified**: `packages/agent-factory-sdk/src/services/model-resolver.ts` - Added llama.cpp case and default model resolution
- **Modified**: `packages/agent-factory-sdk/src/services/index.ts` - Exported llamacpp provider

### Agent Factory & Prompts
- **Modified**: `packages/agent-factory-sdk/src/index.ts` - Added Llama 3.1 8B to SUPPORTED_MODELS list
- **Modified**: `packages/agent-factory-sdk/src/agents/prompts/read-data-agent.prompt.ts` - Enhanced with stronger anti-hallucination guidance
- **Modified**: `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts` - Configurable timeout, improved logging
- **Modified**: `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts` - Model resolver update
- **Modified**: `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts` - Model resolver update

### Performance Optimizations
- **Modified**: `packages/agent-factory-sdk/src/agents/actors/read-data-agent.actor.ts` - Lazy-load datasources, caching, parallel attachment with timeout
- **Modified**: `packages/agent-factory-sdk/src/services/duckdb-query-engine.service.ts` - Parallel datasource attachment (10s timeout), idempotent initialization
- **Modified**: `packages/agent-factory-sdk/src/agents/factory-agent.ts` - Enhanced logging with timing, better error messages
- **Modified**: `packages/agent-factory-sdk/src/agents/state-machine.ts` - Increased timeout from 30s to 100s, better error handling
- **Modified**: `packages/agent-factory-sdk/src/services/browser-transport.ts` - Stream timeout protection (90s), better error handling

### Data & Schema Processing
- **Modified**: `packages/domain/src/services/datasources/transform-metadata-to-simple-schema.service.ts` - Filter out system schemas (pg_catalog, information_schema) automatically
- **Modified**: `packages/agent-factory-sdk/src/tools/foreign-datasource-attach.ts` - Added 10-second timeout per datasource attachment

### Utilities & Services
- **Modified**: `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts` - Model resolver update
- **Modified**: `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts` - Model resolver update
- **Modified**: `packages/agent-factory-sdk/src/services/usage-persistence.service.ts` - Idempotent usage tracking with duplicate handling
- **Modified**: `packages/repositories/sqlite/src/usage.repository.ts` - Microsecond-level ID generation, collision prevention

### Configuration & Dependencies
- **Modified**: `package.json` - Added `@ai-sdk/openai`, `@ai-sdk/openai-compatible`, `ai`, `openai` as dev dependencies
- **Modified**: `pnpm-lock.yaml` - Locked new dependency versions
- **Modified**: `apps/cli/package.json` - Updated `@ai-sdk/openai` to v2.0.71
- **Deleted**: `apps/cli/.env.example` - Example config centralized
- **Deleted**: `apps/web/.env.example` - Example config centralized

### Build Outputs (Auto-generated)
- **Modified**: `apps/web/.react-router/types/**/*.ts` - Auto-generated React Router types
- **Modified**: `apps/web/public/extensions/*/driver.js` - Updated notebook entity default query (9 newlines for 10 lines total)

---

## Environment Variables

### LLM Provider Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_AGENT_PROVIDER` | No | `azure` | AI provider: `azure`, `ollama`, `llamacpp`, `webllm`, `browser`, `transformer` |
| `LLAMACPP_BASE_URL` | No* | `http://127.0.0.1:8080/v1` | llama.cpp server endpoint (*required if using llamacpp) |
| `LLAMACPP_MODEL` | No* | `meta-llama-3.1-8b-instruct` | Model name to use with llama.cpp (*required if using llamacpp) |
| `INTENT_DETECTION_TIMEOUT_MS` | No | `90000` | Timeout for intent detection in milliseconds |

### Data & Workspace Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_WORKING_DIR` | No | `workspace` | Working directory for DuckDB files and local data |
| `VITE_DATABASE_PROVIDER` | No | `sqlite` | Storage backend: `memory`, `indexed-db`, `sqlite` |
| `VITE_DATABASE_PATH` | No | `qwery.db` | Path to local database file |

---

## Build Status

### ✅ All Builds Pass
```bash
# Verify builds
pnpm typecheck       # TypeScript checking - ✅ PASS
pnpm lint:fix        # Linting (with fixes) - ✅ PASS
pnpm format:fix      # Code formatting - ✅ PASS
pnpm build           # Full build (excluding desktop) - ✅ PASS


