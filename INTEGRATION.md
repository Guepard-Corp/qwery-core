# Local LLM Integration - Llama.cpp Provider

This document describes the integration of a local llama.cpp-based LLM provider into the Qwery Core platform.

## Overview

A new model provider has been added to support running local Large Language Models (LLMs) using llama.cpp server, eliminating the dependency on cloud-based LLM services like Azure OpenAI.

## Local LLM Used

**Llama.cpp Server** - A fast, lightweight inference engine for running LLMs locally. The server exposes an OpenAI-compatible API, making it easy to integrate with existing AI SDK tooling.

### Why Llama.cpp?

- **Fully local**: No data sent to cloud services
- **OpenAI-compatible API**: Easy integration with existing tooling
- **Efficient**: Optimized C++ implementation for fast inference
- **Flexible**: Supports various quantized models (GGUF format)

## Implementation Details

### Files Modified

1. **packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts** (NEW)
   - New provider implementation for llama.cpp
   - Uses `@ai-sdk/openai` to connect to llama.cpp's OpenAI-compatible endpoint

2. **packages/agent-factory-sdk/src/services/model-resolver.ts** (MODIFIED)
   - Added `llamacpp` case to provider switch statement
   - Loads llama.cpp provider with environment configuration

3. **packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts** (MODIFIED)
   - Removed hardcoded Azure model reference
   - Added model parameter to accept dynamic model selection
   - Updated actor to pass model from input

4. **packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts** (MODIFIED)
   - Removed hardcoded Azure model reference
   - Added model parameter to accept dynamic model selection
   - Updated actor to pass model from input

5. **packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts** (MODIFIED)
   - Removed hardcoded Azure model reference
   - Added model parameter to accept dynamic model selection
   - Updated actor to pass model from input

6. **packages/agent-factory-sdk/src/agents/state-machine.ts** (MODIFIED)
   - Updated systemInfo state to pass model parameter to systemInfoActor

7. **packages/agent-factory-sdk/package.json** (MODIFIED)
   - Added `@ai-sdk/openai` dependency (v2.0.78)

8. **packages/agent-factory-sdk/src/index.ts** (MODIFIED)
   - Added "Llama.cpp (Local)" to SUPPORTED_MODELS list
   - Made it the first (default) option

9. **apps/web/.env** (MODIFIED)
   - Removed Azure OpenAI credentials
   - Added llama.cpp configuration

10. **apps/web/.env.example** (MODIFIED)
   - Commented out Azure configuration
   - Added llama.cpp environment variables as defaults

### Environment Variables Added

The following environment variables control the llama.cpp provider:

```bash
# Base URL of the llama.cpp server (default: http://localhost:8080)
LLAMACPP_BASE_URL=http://localhost:8080

# Model name to use (default: llama-model)
LLAMACPP_MODEL=llama-model

# API key (optional, llama.cpp doesn't require one)
LLAMACPP_API_KEY=not-needed
```

## How to Run the Solution

### Prerequisites

- Node.js 18+ and pnpm installed
- A llama.cpp server running locally

### Step 1: Set up Llama.cpp Server

#### Option A: Using llama-server (Recommended)

1. Download or build llama.cpp from https://github.com/ggerganov/llama.cpp
2. Download a GGUF model (e.g., from Hugging Face)
3. Start the server:

```bash
./llama-server -m path/to/model.gguf --port 8080 --host 0.0.0.0
```

#### Option B: Using llama.cpp with Python bindings

```bash
pip install llama-cpp-python[server]
python -m llama_cpp.server --model path/to/model.gguf --port 8080
```

### Step 2: Configure Environment Variables

Update `apps/web/.env`:

```bash
# If running on a different port or host
LLAMACPP_BASE_URL=http://localhost:8080

# Set the model name (can be anything, llama.cpp uses the model from CLI)
LLAMACPP_MODEL=llama-model

# API key (not required for llama.cpp)
LLAMACPP_API_KEY=not-needed
```

### Step 3: Install Dependencies

```bash
pnpm install
```

### Step 4: Build the Project

Build the web app:
```bash
cd apps/web
pnpm build
```

Build extensions:
```bash
cd ../..
pnpm extensions:build
```

### Step 5: Run Qwery

```bash
pnpm --filter web dev
```

The application will now use the local llama.cpp server instead of Azure OpenAI.

## How the Provider Works

### Architecture

1. **Provider Interface**: The llama.cpp provider implements the standard `ModelProvider` interface:
   ```typescript
   type ModelProvider = {
     resolveModel: (modelName: string) => LanguageModel;
   };
   ```

2. **OpenAI Compatibility**: Llama.cpp server exposes an OpenAI-compatible API at `/v1/*` endpoints. We use `@ai-sdk/openai` with a custom base URL pointing to the local server.

3. **Model Resolution Flow**:
   - User selects "Llama.cpp (Local)" or passes `llamacpp/llama-model` as model string
   - `model-resolver.ts` parses the string and creates the llama.cpp provider
   - Provider loads environment variables (`LLAMACPP_BASE_URL`, `LLAMACPP_MODEL`, etc.)
   - Returns a configured `LanguageModel` instance from the AI SDK

4. **Integration Points**:
   - Chat API: `apps/web/app/routes/api/chat.ts`
   - Notebook prompts: `apps/web/app/routes/api/notebook/prompt.ts`
   - Agent factory: `packages/agent-factory-sdk/src/agents/factory-agent.ts`

### Provider Code Structure

```typescript
export function createLlamaCppModelProvider({
  baseUrl = 'http://localhost:8080',
  defaultModel = 'llama-model',
  apiKey = 'not-needed',
}: LlamaCppModelProviderOptions): ModelProvider {
  const llamacpp = createOpenAI({
    baseURL: `${baseUrl}/v1`,
    apiKey,
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      return llamacpp(finalModel);
    },
  };
}
```

## Verification

### Build Verification

Both build commands completed successfully:

✅ **Web App Build**: `cd apps/web && pnpm build`
- No TypeScript errors
- All dependencies resolved
- Output: Production-ready build in `build/` directory

✅ **Extensions Build**: `pnpm extensions:build`
- All browser drivers bundled
- Registry files generated
- No errors

## Important Implementation Note

The Vercel AI SDK version 5.x introduced a new "responses" API (`/v1/responses`) that is incompatible with llama.cpp's standard OpenAI-compatible endpoint. The solution was to explicitly use `.chat()` method which forces the SDK to use the standard `/v1/chat/completions` endpoint:

```typescript
// Incorrect - uses new /v1/responses endpoint
return llamacpp(finalModel);

// Correct - uses standard /v1/chat/completions endpoint
return llamacpp.chat(finalModel);
```

### Testing the Integration

1. Start llama.cpp server with your chosen model
2. Run Qwery: `pnpm --filter web dev`
3. Open the application in browser
4. Create a new conversation or notebook
5. Select "Llama.cpp (Local)" from the model dropdown
6. Send a query and verify the response comes from your local model

## Model Selection

The llama.cpp provider is now available in the model dropdown as:
- **"Llama.cpp (Local)"** - `llamacpp/llama-model`

This is set as the first option in the SUPPORTED_MODELS list, making it the default choice.

## Assumptions Made

1. **Server API Compatibility**: Llama.cpp server implements OpenAI-compatible endpoints at `/v1/*`
2. **Model Name**: The model name passed to the API doesn't need to match the actual model file (llama.cpp loads the model from CLI arguments)
3. **No Authentication**: Local llama.cpp servers typically don't require API keys
4. **Default Port**: Standard port 8080 is used (configurable via environment)
5. **Local Network**: Server runs on localhost (can be changed for remote servers)

## Benefits of This Integration

1. **Privacy**: All data processing happens locally
2. **No API Costs**: No charges for LLM API usage
3. **Offline Capability**: Works without internet connection
4. **Model Flexibility**: Can use any GGUF-format model
5. **Performance**: Can be faster for local deployment with good hardware

## Future Enhancements

Potential improvements for production use:

1. **Health Check**: Add endpoint to verify llama.cpp server is running
2. **Model Discovery**: Auto-detect available models from server
3. **Streaming Support**: Optimize for streaming responses
4. **Error Handling**: Better user feedback when server is unavailable
5. **Model Configuration**: Support for temperature, top_p, and other parameters via UI

## Troubleshooting

### Common Issues

1. **"Connection refused" errors**
   - Ensure llama.cpp server is running on the configured port
   - Check `LLAMACPP_BASE_URL` matches your server address

2. **Slow responses**
   - Model may be too large for your hardware
   - Try a smaller quantized version (e.g., Q4_K_M instead of Q8_0)

3. **Build failures**
   - Run `pnpm install` to ensure all dependencies are installed
   - Check that `@ai-sdk/openai` is in `package.json`

## Conclusion

This integration successfully replaces cloud-based LLM dependencies with a local llama.cpp server, maintaining full compatibility with Qwery's existing agent factory architecture while enabling private, offline, and cost-free LLM inference.
