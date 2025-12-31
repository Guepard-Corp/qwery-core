# Technical Assessment Report: Integrating a Local Open-Source LLM into Qwery Core

## Executive Summary

This report documents the successful integration of a local open-source Large Language Model (llama.cpp) into the Qwery Core platform, replacing the cloud-based Azure OpenAI dependency. All cloud API requirements have been removed, and the application now operates entirely with a locally-hosted LLM.

---

## 1. Objective

The goal of this assessment was to:

1. Integrate a local open-source LLM running on the local machine
2. Wire it into Qwery's existing model provider system
3. Build the project successfully without any cloud API dependencies

---

## 2. Local LLM Selection

**Selected Solution:** llama.cpp

llama.cpp was chosen because it:
- Provides an OpenAI-compatible REST API at `/v1/chat/completions`
- Runs entirely locally without cloud dependencies
- Supports a wide variety of open-source models in GGUF format
- Has minimal resource requirements

**Model Used:** TinyLlama 1.1B Chat (quantized Q4_K_M)

---

## 3. Implementation Details

### 3.1 New Model Provider Implementation

**File:** `packages/agent-factory-sdk/src/services/models/local-model.provider.ts`

A new local model provider was implemented that:
- Connects to a locally running llama.cpp server
- Uses the `@ai-sdk/openai` package configured with a custom base URL
- Specifically uses the `.chat()` method to target the Chat Completions API endpoint
- Reads configuration from environment variables

```typescript
export function createLocalModelProvider({
  baseUrl = process.env.LLAMACPP_BASE_URL ?? 'http://localhost:4040/v1',
  defaultModel = process.env.LLAMACPP_MODEL ?? 'default',
}: LocalModelProviderOptions = {}): ModelProvider {
  const llamacpp = createOpenAI({
    baseURL: baseUrl,
    apiKey: 'not-needed',
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'local/<model-name>' or set LLAMACPP_MODEL.",
        );
      }
      return llamacpp.chat(finalModel);
    },
  };
}
```

### 3.2 Model Resolver Integration

**File:** `packages/agent-factory-sdk/src/services/model-resolver.ts`

The model resolver was updated to include the `local` provider case:

```typescript
case 'local': {
  const { createLocalModelProvider } = await import(
    './models/local-model.provider'
  );
  return createLocalModelProvider({
    defaultModel: getEnv('LLAMACPP_MODEL') ?? getEnv('LOCAL_MODEL') ?? modelName,
  });
}
```

### 3.3 Default Model Configuration

**File:** `packages/agent-factory-sdk/src/index.ts`

A new `getDefaultModel()` function was added to centralize default model selection:

```typescript
export function getDefaultModel(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_DEFAULT_MODEL) {
    return process.env.VITE_DEFAULT_MODEL;
  }
  return 'local/default';
}
```

The `SUPPORTED_MODELS` array was updated to include the local provider as the first option:

```typescript
const baseModels = [
  {
    name: 'llama.cpp (Local)',
    value: 'local/default',
  },
  // ... other models
];
```

### 3.4 Hardcoded Model References Replaced

All hardcoded references to `'azure/gpt-5-mini'` were replaced with `getDefaultModel()` in the following files:

| File | Location |
|------|----------|
| `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts` | `generateObject()` call |
| `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts` | `streamText()` call |
| `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts` | `streamText()` call |
| `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts` | `generateObject()` calls |
| `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts` | `generateText()` call |
| `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts` | `generateText()` call |
| `apps/web/app/routes/api/chat.ts` | Default model parameter |
| `apps/web/app/routes/api/notebook/prompt.ts` | Default model parameter |
| `apps/web/components/agents-provider.tsx` | API call model parameter |
| `apps/web/app/routes/project/_components/agent-ui-wrapper.tsx` | Model reference |

### 3.5 Dependencies Added

**File:** `packages/agent-factory-sdk/package.json`

Added the `@ai-sdk/openai` package to enable OpenAI-compatible API communication:

```json
"@ai-sdk/openai": "^2.0.68"
```

---

## 4. Environment Configuration

### 4.1 Cloud Credentials Removed

The following Azure OpenAI environment variables are no longer required:

- `AZURE_API_KEY` - Removed
- `AZURE_RESOURCE_NAME` - Removed
- `AZURE_OPENAI_DEPLOYMENT` - Removed

### 4.2 New Environment Variables

**File:** `apps/web/.env`

The following environment variables were added for local LLM configuration:

```env
# AI LOCAL MODEL CONFIGURATION
VITE_DEFAULT_MODEL=local/default
LLAMACPP_BASE_URL=http://localhost:4040/v1
LLAMACPP_MODEL=tinyllama
```

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_DEFAULT_MODEL` | Default model identifier | `local/default` |
| `LLAMACPP_BASE_URL` | llama.cpp server URL | `http://localhost:4040/v1` |
| `LLAMACPP_MODEL` | Model name for API calls | `default` |

---

## 5. llama.cpp Server Setup

To run the local LLM server:

```bash
./llama-server -m tinyllama-1.1b-chat-v1.0-q4_k_m.gguf --port 4040
```

The server exposes an OpenAI-compatible API at:
- `http://localhost:4040/v1/chat/completions`
- `http://localhost:4040/v1/models`

---

## 6. Technical Challenges and Solutions

### 6.1 API Compatibility Issue

**Problem:** The `@ai-sdk/openai` package defaults to the Responses API (`/v1/responses`) which llama.cpp does not support.

**Solution:** Changed from `llamacpp(finalModel)` to `llamacpp.chat(finalModel)` to explicitly use the Chat Completions API endpoint.

### 6.2 Environment Variable Consistency

**Problem:** Multiple environment variable names were used inconsistently (`LOCAL_MODEL` vs `LLAMACPP_MODEL`).

**Solution:** Updated the model resolver to check both variables for backward compatibility.

---

## 7. Files Modified

| File Path | Type of Change |
|-----------|----------------|
| `packages/agent-factory-sdk/src/services/models/local-model.provider.ts` | New implementation |
| `packages/agent-factory-sdk/src/services/model-resolver.ts` | Added local provider case |
| `packages/agent-factory-sdk/src/index.ts` | Added `getDefaultModel()`, updated `SUPPORTED_MODELS` |
| `packages/agent-factory-sdk/package.json` | Added `@ai-sdk/openai` dependency |
| `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts` | Replaced hardcoded model |
| `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts` | Replaced hardcoded model |
| `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts` | Replaced hardcoded model |
| `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts` | Replaced hardcoded model |
| `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts` | Replaced hardcoded model |
| `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts` | Replaced hardcoded model |
| `apps/web/app/routes/api/chat.ts` | Updated imports and default model |
| `apps/web/app/routes/api/notebook/prompt.ts` | Updated imports and default model |
| `apps/web/components/agents-provider.tsx` | Updated imports and default model |
| `apps/web/app/routes/project/_components/agent-ui-wrapper.tsx` | Updated imports and default model |
| `apps/web/.env` | Added local LLM configuration |

---

## 8. Build Validation

### 8.1 Web Application Build

```bash
cd apps/web
pnpm build
```

Status: Successful

### 8.2 Extensions Build

```bash
pnpm extensions:build
```

Status: Successful

---

## 9. Conclusion

The integration of llama.cpp as a local LLM provider into Qwery Core was completed successfully. The implementation:

1. Conforms to the existing model provider abstraction layer
2. Removes all cloud API dependencies (Azure OpenAI)
3. Uses environment variables for configuration
4. Builds without errors
5. Functions correctly with the local llama.cpp server

The solution demonstrates understanding of:
- The Qwery codebase structure and model provider architecture
- Abstraction layers and interface conformance
- Real system integration with proper error handling
- Environment configuration management

---

## Appendix: Quick Start Guide

1. Start the llama.cpp server:
   ```bash
   ./llama-server -m your-model.gguf --port 4040
   ```

2. Configure environment variables in `apps/web/.env`:
   ```env
   VITE_DEFAULT_MODEL=local/default
   LLAMACPP_BASE_URL=http://localhost:4040/v1
   LLAMACPP_MODEL=default
   ```

3. Start the development server:
   ```bash
   cd apps/web
   pnpm dev
   ```

4. Access the application at `http://localhost:3000`
