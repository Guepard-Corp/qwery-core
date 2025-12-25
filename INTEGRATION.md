# Local LLM Integration - llama.cpp Provider

This document describes the integration of a local open-source LLM (llama.cpp) into Qwery's model provider system.

## Local LLM Used

We chose Granite 4.0 Micro from IBM to its good performance in both agentic and coding tasks while also being runnable on consumer laptops that have 4GB VRAM GPUs (as shown and tested in the sent video).

- **Model**: `unsloth/granite-4.0-h-micro-GGUF:Q4_K_XL`
- **Server**: llama.cpp with OpenAI-compatible API
- **Provider ID**: `llamacpp`

## Instructions to Run the Solution

### 1. Prerequisites

- Node.js v22 (check `.nvmrc`)
- pnpm package manager
- llama.cpp server

### 2. Set Up llama.cpp Server

#### Option A: Using Pre-built Binaries

Download from: https://github.com/ggerganov/llama.cpp/releases

#### Option B: Build from Source

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
cmake -B build
cmake --build build --config Release -j $(nproc)
```

### 3. Download the Model

```bash
llama-server -hf unsloth/granite-4.0-h-micro-GGUF:Q4_K_XL
```

Or download manually from: https://huggingface.co/unsloth/granite-4.0-h-micro-GGUF

### 4. Verify that the llama.cpp Server is working

Verify the server is running:
```bash
curl http://localhost:8080/health
```

### 5. Install Dependencies and Build

```bash
cd qwery-core

# Use correct Node version
nvm use 22

# Install dependencies
pnpm install

# Build web app
cd apps/web
pnpm build

# Build extensions (from root)
cd ../..
pnpm extensions:build
```

### 6. Run the Development Server

```bash
cd apps/web
pnpm dev
```

## Environment Variables Added

| Variable | Description | Default |
|----------|-------------|---------|
| `LLAMACPP_BASE_URL` | Base URL for llama.cpp server | `http://localhost:8080/v1` |
| `LLAMACPP_MODEL` | Model name identifier | `granite-4.0-micro` |
| `LLAMACPP_API_KEY` | API key (optional, llama.cpp doesn't require one) | `llamacpp-local` |

### Example `.env` Configuration

```env
# llama.cpp Local LLM Configuration
LLAMACPP_BASE_URL=http://localhost:8080/v1
LLAMACPP_MODEL=granite-4.0-micro
LLAMACPP_API_KEY=llamacpp-local
```

## List of Modified Files

### New Files Created

| File | Purpose |
|------|---------|
| `packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts` | New provider for llama.cpp server using OpenAI-compatible API |
| `apps/web/.env` | Environment configuration with llama.cpp settings |

### Files Modified

| File | Changes |
|------|---------|
| `packages/agent-factory-sdk/src/services/model-resolver.ts` | Added `llamacpp` case to provider switch; removed Azure and Ollama providers |
| `packages/agent-factory-sdk/src/services/index.ts` | Exported llamacpp provider; removed Azure and Ollama exports |
| `packages/agent-factory-sdk/src/index.ts` | Added llamacpp to `SUPPORTED_MODELS`; removed `createAzure` export |
| `packages/agent-factory-sdk/package.json` | Added `@ai-sdk/openai` dependency; removed `@ai-sdk/azure`, `@ai-sdk/amazon-bedrock`, `ai-sdk-ollama` |
| `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts` | Changed default model from `azure/gpt-5-mini` to `llamacpp/granite-4.0-micro` |
| `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts` | Changed default model to `llamacpp/granite-4.0-micro` |
| `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts` | Changed default model to `llamacpp/granite-4.0-micro` |
| `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts` | Changed default model to `llamacpp/granite-4.0-micro` |
| `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts` | Changed default model to `llamacpp/granite-4.0-micro` |
| `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts` | Changed default model to `llamacpp/granite-4.0-micro` |
| `packages/agent-factory-sdk/src/services/usage-persistence.service.ts` | Updated documentation example |
| `apps/web/app/routes/api/chat.ts` | Changed default model to `llamacpp/granite-4.0-micro` |
| `apps/web/app/routes/api/notebook/prompt.ts` | Changed default model to `llamacpp/granite-4.0-micro` |

### Files Deleted

| File | Reason |
|------|--------|
| `packages/agent-factory-sdk/src/services/models/azure-model.provider.ts` | Removed cloud LLM dependency |
| `packages/agent-factory-sdk/src/services/models/ollama-model.provider.ts` | Removed cloud LLM dependency |

## Build Verification

Both build commands complete successfully:

```bash
# Web app build
cd apps/web && pnpm build
# ✅ Passes

# Extensions build
cd qwery-core && pnpm extensions:build
# ✅ Passes
```

## Assumptions Made

1. **llama.cpp server runs on port 8080**: The default configuration assumes the server is available at `http://localhost:8080`. This can be changed via `LLAMACPP_BASE_URL`.

2. **Model name is informational**: llama.cpp server serves whatever model was loaded with the `-m` flag. The model name passed in API calls (`granite-4.0-micro`) is used for identification/logging purposes.

3. **Chat Completions API**: The integration uses the OpenAI Chat Completions API (`/v1/chat/completions`) rather than the newer Responses API, as llama.cpp only supports the former.

4. **No API key required**: llama.cpp doesn't require authentication, but the OpenAI SDK requires a non-empty API key string, so we use a placeholder value.

5. **Cloud LLM removal scope**: Removed Azure, Ollama, and Amazon Bedrock providers from the agent-factory-sdk package.

## How the Provider Works

The llama.cpp provider leverages the fact that llama.cpp exposes an OpenAI-compatible API. The implementation:

1. Uses `@ai-sdk/openai` with `createOpenAI()` to create a custom provider
2. Points the `baseURL` to the local llama.cpp server
3. Uses `.chat()` method to force Chat Completions API (not Responses API)
4. Passes through model names and handles errors gracefully

```typescript
const llamacpp = createOpenAI({
  baseURL: 'http://localhost:8080/v1',
  apiKey: 'llamacpp-local',
  compatibility: 'compatible',
});

// Returns a LanguageModel compatible with AI SDK
return llamacpp.chat(modelName);
```

## Usage

To use the llama.cpp provider in the application:

Select **"Granite 4.0 Micro (Local)"** from the model dropdown in the UI (which is already the default and only option).
