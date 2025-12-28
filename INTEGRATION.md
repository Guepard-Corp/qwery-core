# Local LLM Integration - LM Studio

## Overview

This integration replaces Azure OpenAI with **LM Studio**, a local open-source LLM solution. The integration uses the existing model provider abstraction layer in Qwery Core.

## Local LLM Used

- **Provider**: LM Studio
- **Model**: llama-3.2-3b-instruct
- **API Compatibility**: OpenAI-compatible API
- **Default Endpoint**: `http://127.0.0.1:1234/v1`

## Prerequisites

1. **Install LM Studio**: Download and install from [lmstudio.ai](https://lmstudio.ai/)
2. **Download Model**: In LM Studio, download `llama-3.2-3b-instruct` (or any compatible model)
3. **Start Local Server**: 
   - Open LM Studio
   - Load your model
   - Start the local server (default port: 1234)

## Environment Variables

Add the following to your `.env` file:

```bash
# LM Studio Configuration
LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
LMSTUDIO_MODEL=llama-3.2-3b-instruct
```

**Note**: Both variables are optional. Defaults are:
- `LMSTUDIO_BASE_URL`: `http://127.0.0.1:1234/v1`
- `LMSTUDIO_MODEL`: Uses model name from the model string (e.g., `lmstudio/llama-3.2-3b-instruct`)

## Removed Cloud Dependencies

The following Azure OpenAI environment variables are **no longer required**:
- ❌ `AZURE_API_KEY`
- ❌ `AZURE_RESOURCE_NAME`
- ❌ `AZURE_OPENAI_DEPLOYMENT`

## How It Works

1. **Provider Registration**: LM Studio provider is registered in the model resolver (`packages/agent-factory-sdk/src/services/model-resolver.ts`)
2. **Model Resolution**: When a model string like `lmstudio/llama-3.2-3b-instruct` is used, the resolver creates an LM Studio provider instance
3. **API Compatibility**: LM Studio uses OpenAI-compatible endpoints, so the integration leverages the OpenAI SDK with a custom baseURL
4. **Default Models**: All default model references have been updated to use `lmstudio/llama-3.2-3b-instruct`

## Modified Files

### Core Provider Files
- `packages/agent-factory-sdk/src/services/models/lmstudio-model.provider.ts` - LM Studio provider implementation
- `packages/agent-factory-sdk/src/services/model-resolver.ts` - Added LM Studio case to provider resolver
- `packages/agent-factory-sdk/src/index.ts` - Updated default model to LM Studio

### Application Files (Updated Default Models)
- `apps/web/app/routes/api/notebook/prompt.ts`
- `apps/web/app/routes/api/chat.ts`
- `apps/web/components/agents-provider.tsx`
- `apps/web/app/routes/project/_components/agent-ui-wrapper.tsx`

### Agent Actor Files
- `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts`
- `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts`
- `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts`
- `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts`
- `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts`
- `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts`

## Build Verification

Both required builds complete successfully:

✅ **Web App Build**:
```bash
cd apps/web
pnpm build
```

![Web App Build Success](Capture%20d'écran%202025-12-28%20201747.png)

✅ **Extensions Build**:
```bash
pnpm extensions:build
```

![Extensions Build Success](Capture%20d'écran%202025-12-28%20201728.png)

## Error Handling

If LM Studio is not running, the application will:
- Attempt to connect to `http://127.0.0.1:1234/v1`
- Return connection errors if the server is unavailable
- Display appropriate error messages in the UI

## Testing

1. Ensure LM Studio is running with a loaded model
2. Start the Qwery web application
3. Create a datasource and execute a query
4. Verify that prompts are sent to the local LM Studio instance

## Assumptions

1. LM Studio server is running on the default port (1234)
2. The model name matches the format used in model strings (e.g., `llama-3.2-3b-instruct`)
3. LM Studio's OpenAI-compatible API is enabled
4. No authentication is required (LM Studio doesn't require real API keys)

