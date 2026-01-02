# Local LLM Integration - Guepard Corp Assessment

## Overview

This document describes the successful integration of a local open-source LLM (Mistral-7B via Ollama/llama.cpp) into Qwery Core, replacing the Azure OpenAI dependency.

## Local LLM Details

| Aspect | Details |
|--------|---------|
| **LLM Model** | Mistral-7B-Instruct-Q4_K_M |
| **Inference Engine** | llama.cpp (via Ollama) |
| **Provider** | Ollama API |
| **VRAM Requirement** | ~6GB (Q4 quantization) |
| **API Endpoint** | `http://localhost:11434` |
| **Provider Format** | `ollama/mistral` |

## Architecture

The integration follows the existing provider abstraction pattern in Qwery Core:

```
Qwery Application
    ↓
model-resolver.ts (factory pattern)
    ↓
Parses model string: "ollama/mistral"
    ↓
ollama-model.provider.ts
    ↓
HTTP API Call → Ollama Server (localhost:11434)
    ↓
llama.cpp + Mistral-7B Model
```

### Provider Implementation

The Ollama provider was already implemented in the codebase:
- **File**: `packages/agent-factory-sdk/src/services/models/ollama-model.provider.ts`
- **Factory**: `packages/agent-factory-sdk/src/services/model-resolver.ts`
- **Port/Interface**: `packages/agent-factory-sdk/src/ports/ai-model.port.ts`

## Setup Instructions

### Prerequisites

- Windows 10/11 (or macOS/Linux)
- Node.js v22.12.0+
- pnpm v10.26.2+
- 6GB+ VRAM (for Mistral-7B Q4)

### Step 1: Install Ollama

1. Download Ollama for Windows: https://ollama.ai
2. Run the installer and follow the setup wizard
3. Ollama will start as a background service

### Step 2: Pull Mistral Model

Open PowerShell or Command Prompt and run:

```bash
ollama pull mistral:latest
```

This downloads Mistral-7B-Instruct (~4.7GB with quantization).

### Step 3: Start Ollama Server

Ollama runs as a service automatically. Verify it's running:

```bash
# Test the API endpoint
curl http://localhost:11434/api/tags
```

You should see the model listed in the response.

### Step 4: Configure Environment Variables

Create or update `.env` files in your application directories:

**For Web App** (`apps/web/.env`):
```bash
# AI Provider Configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

**For CLI** (`apps/cli/.env`):
```bash
# AI Provider Configuration
VITE_AGENT_PROVIDER=ollama
AGENT_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
```

### Step 5: Install Dependencies & Build

```bash
# Install pnpm if you don't have it
npm install -g pnpm@10.26.2

# Install project dependencies
pnpm install

# Optimize memory for builds (6GB VRAM)
set NODE_OPTIONS=--max-old-space-size=4096

# Build the project
pnpm build

# Build extensions
pnpm extensions:build
```

### Step 6: Run the Application

```bash
# Start all applications in development mode
pnpm dev

# Or start specific app:
pnpm --filter web dev
```

The application will now use your local Mistral-7B model instead of Azure OpenAI.

## Environment Variables

### Added/Modified

| Variable | Value | Description |
|----------|-------|-------------|
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `mistral` | Model name (without quantization suffix) |
| `VITE_AGENT_PROVIDER` | `ollama` | Provider identifier (web) |
| `AGENT_PROVIDER` | `ollama` | Provider identifier (CLI) |
| `NODE_OPTIONS` | `--max-old-space-size=4096` | Heap memory for builds (6GB systems) |

### Removed

The following Azure-specific variables are no longer required:
- `AZURE_API_KEY`
- `AZURE_RESOURCE_NAME`
- `AZURE_API_VERSION`
- `AZURE_OPENAI_BASE_URL`
- `AZURE_OPENAI_DEPLOYMENT`

## Files Modified

### Core Provider Changes
- `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts`
  - Line 39: Changed `'azure/gpt-5-mini'` → `'ollama/mistral'`
- `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts`
  - Line 48: Changed `'azure/gpt-5-mini'` → `'ollama/mistral'`

### API Route Changes
- `apps/web/app/routes/api/notebook/prompt.ts`
  - Line 277: Changed default model `'azure/gpt-5-mini'` → `'ollama/mistral'`
  - Line 310: Fixed `detectIntent` call to include required `model` parameter

### UI Component Changes
- `apps/web/components/agents-provider.tsx`
  - Line 191: Changed fallback model `'azure/gpt-5-mini'` → `'ollama/mistral'`

### Deleted Files
- `packages/agent-factory-sdk/src/services/models/azure-model.provider.ts` (removed)

## Build Verification

All builds pass successfully:

```
✓ pnpm build
  - Tasks: 15 successful, 15 total
  - Time: 7m 10s
  - Status: ALL PASSED

✓ pnpm extensions:build
  - All extensions bundled successfully
  - Registry generated
  - Status: ALL PASSED

✓ pnpm typecheck
  - Packages: 30 successful, 30 total
  - TypeScript errors: 0
  - Status: ALL PASSED

✓ pnpm format:fix
  - Code formatted to standards
  - Status: PASSED
```

## Usage Examples

### Example 1: Chat API

```bash
# Start Ollama (if not running as service)
ollama serve

# In another terminal, test the chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What are SQL indices?"}],
    "model": "ollama/mistral"
  }'
```

### Example 2: Intent Detection

The system automatically detects user intent using the local model:

```typescript
import { detectIntent } from '@qwery/agent-factory-sdk';

const result = await detectIntent(
  "Show me orders from last month",
  "ollama/mistral"
);

// Returns:
// {
//   intent: 'query',
//   complexity: 'medium',
//   needsSQL: true,
//   needsChart: false
// }
```

### Example 3: Title Generation

Conversation titles are now generated locally:

```typescript
import { generateConversationTitle } from '@qwery/agent-factory-sdk/services';

const title = await generateConversationTitle(
  "Show me the top 10 customers by revenue",
  "Based on 2024 sales data..."
);

// Returns: "Top 10 Customers by Revenue"
```

## Assumptions Made

1. **Local Development Only**: This integration is optimized for local development. For production deployment, consider:
   - Using a dedicated inference server (vLLM, text-generation-webui)
   - Running Ollama on a separate machine
   - Implementing request queuing for high throughput

2. **Model Availability**: Ollama pulls the model on-demand. First run may take time depending on internet speed.

3. **Memory Constraints**: Mistral-7B Q4 quantization requires ~6GB VRAM. For larger models or higher precision:
   - Use smaller models (Phi, TinyLLM)
   - Increase VRAM or use offloading
   - Consider different quantization levels

4. **Latency**: Local LLM inference is slower than cloud APIs:
   - Mistral-7B: ~100-500ms per token
   - Expected response time: 5-30 seconds
   - This is acceptable for development/testing

5. **No Breaking Changes**: All API contracts remain the same. The abstraction layer ensures compatibility with future providers.

6. **Build Memory**: Setting `NODE_OPTIONS=--max-old-space-size=4096` is necessary for 6GB systems. Adjust as needed.

## Testing

To verify the integration works:

```bash
# 1. Check Ollama is running
curl http://localhost:11434/api/tags

# 2. Run typecheck
pnpm typecheck

# 3. Run linter
pnpm lint:fix

# 4. Run tests (if available)
pnpm test

# 5. Start dev server and test manually
pnpm dev
```

## Future Enhancements

Possible future improvements:

1. **Provider Configuration UI**: Allow switching providers at runtime
2. **Model Selector**: Support multiple local models (Llama, Phi, Openchat)
3. **Performance Monitoring**: Track latency and token throughput
4. **Fallback Mechanism**: Automatic fallback to cloud API if local service is unavailable
5. **Quantization Options**: Easy switching between Q4, Q5, Q8 models

## Support & Troubleshooting

### Issue: "Connection refused" error

**Solution**: Ensure Ollama is running
```bash
# Check if Ollama service is running
Get-Service | Select-String -Pattern "ollama"

# If not running, start it
ollama serve
```

### Issue: Out of Memory during build

**Solution**: Increase heap size
```bash
set NODE_OPTIONS=--max-old-space-size=6144
pnpm build
```

### Issue: Ollama model not found

**Solution**: Pull the model
```bash
ollama pull mistral:latest
```

### Issue: Slow response times

**Solution**: Possible causes and fixes
- Model is still loading: Wait for first request to warm up
- System is low on RAM: Check Task Manager, close other apps
- CPU throttling: Check power settings, set to "High Performance"
- Model quantization too aggressive: Re-pull with different quantization

## Submission Details

- **Assessment**: Guepard Corp Internship - AI Integration
- **Submitted**: January 2, 2026
- **Status**: Complete and tested
- **All Requirements Met**: ✓

## Additional Resources

- Ollama Documentation: https://github.com/ollama/ollama
- Mistral Model Card: https://huggingface.co/mistralai/Mistral-7B-Instruct-v0.2
- Qwery Core Repository: https://github.com/Guepard-Corp/qwery-core
