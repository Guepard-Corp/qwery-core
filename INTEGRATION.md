# Local LLM Integration - Technical Summary

## Local LLM Used

**Model:** Ministral 3B (`ministralai/ministral-3-3b`)
**Provider:** LM Studio (OpenAI-compatible API)
**Inference:** 100% local, no cloud dependencies

### Model Selection Rationale

This 3 billion parameter model was selected due to hardware resource constraints. While functional for basic operations, it has known limitations:

- **Limitation:** Insufficient for reliable structured JSON output (affects intent detection, chart generation)
- **Recommendation:** Upgrade to 7B+ models (Mistral-7B, Llama-3.2-8B) when resources permit
- **Trade-off:** Privacy and cost savings vs. capability constraints

## Instructions to Run the Solution

### Prerequisites

1. **Install LM Studio**
   ```bash
   # Download from https://lmstudio.ai
   ```

2. **Download and Load Model**
   - Open LM Studio
   - Search for "ministralai/ministral-3-3b" (or "Mistral-7B" recommended)
   - Download the model
   - Load it in the LM Studio server

3. **Start LM Studio Server**
   - Click "Start Server" in LM Studio
   - Ensure it's running on `http://127.0.0.1:1234`
   - Verify with: `curl http://127.0.0.1:1234/v1/models`

### Setup & Run

```bash
# 1. Clone and install dependencies
git clone <repository-url>
cd qwery-core
pnpm install

# 2. Configure environment
cp apps/web/.env.example apps/web/.env
# Edit .env if using a different model

# 3. Verify type safety
pnpm typecheck

# 4. Start development server
pnpm dev

# Access at http://localhost:3000
```

### Verify LM Studio Connection

```bash
# Test model availability
curl http://127.0.0.1:1234/v1/models

# Test inference
curl -X POST http://127.0.0.1:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "ministralai/ministral-3-3b",
    "messages": [{"role": "user", "content": "Hello"}]
  }'
```

## Environment Variables Added

### Required Variables

```bash
# AI Model Configuration
VITE_DEFAULT_LLM_MODEL=lmstudio/ministralai/ministral-3-3b
# Format: <provider>/<model-name>
# Supports nested paths: lmstudio/org/model-name

# LM Studio Configuration
VITE_LLM_PROVIDER=lmstudio
LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
LMSTUDIO_MODEL_NAME=ministralai/ministral-3-3b
```

## List of Modified Files

### Summary: 17 files changed (+59 lines, -58 lines)

#### Configuration Files (2)
- `apps/web/.env.example` - Added LM Studio configuration, removed Azure variables
- `README.md` - Added AI Model & Provider System documentation section

#### Core SDK & Services (5)
- `packages/agent-factory-sdk/src/index.ts` - Added Ministral 3B to supported models
- `packages/agent-factory-sdk/src/services/model-resolver.ts` - Implemented `getDefaultModel()`, enhanced model parsing
- `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts` - Replaced hardcoded Azure model
- `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts` - Replaced hardcoded Azure model
- `packages/agent-factory-sdk/src/services/usage-persistence.service.ts` - Updated model references

#### Agent Actors (3)
- `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts` - Uses `getDefaultModel()`, added retry logic
- `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts` - Uses `getDefaultModel()`
- `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts` - Uses `getDefaultModel()`

#### Agent Tools (1)
- `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts` - Updated 2 model references

#### API Routes (2)
- `apps/web/app/routes/api/chat.ts` - Changed default from `azure/gpt-5-mini` to configurable
- `apps/web/app/routes/api/notebook/prompt.ts` - Uses `getDefaultModel()`

#### UI Components (2)
- `apps/web/app/routes/project/_components/agent-ui-wrapper.tsx` - Uses `getDefaultModel()`
- `apps/web/components/agents-provider.tsx` - Updated model resolution

#### Extension Package Metadata (11)
- `packages/extensions/*/package.json` - Added `"import"` condition to exports for ESM compatibility
  - clickhouse-node, clickhouse-web, duckdb, duckdb-wasm, gsheet-csv
  - json-online, mysql, parquet-online, pglite, postgresql, youtube-data-api-v3

#### Dependencies
- `packages/agent-factory-sdk/package.json` - Version bumps (no new dependencies)
- `pnpm-lock.yaml` - Lockfile update

## Build Status

### Type Checking
```bash
✅ pnpm typecheck - PASSED
```
All 36 packages in scope typecheck successfully with zero errors.

### Linting
```bash
✅ pnpm lint:fix - PASSED
```
ESLint passes with no violations.

### Build Verification
```bash
✅ Extension resolution errors - FIXED
✅ Vite/Rollup ESM imports - RESOLVED
```

Previously failing with:
```
[commonjs--resolver] Failed to resolve entry for package "@qwery/extension-*"
```

Fixed by adding `"import"` condition to 11 extension packages.

### Runtime Testing
- ✅ LM Studio connection successful (`http://127.0.0.1:1234/v1/models`)
- ✅ Model inference operational (chat completions endpoint)
- ⚠️ Structured JSON output limited by 3B model size (expected)

## Assumptions Made

### 1. Hardware Constraints
**Assumption:** Deployment environment has limited resources (RAM/CPU)
**Impact:** Selected 3B model instead of recommended 7B+
**Mitigation:** Documented upgrade path in `APPROACH.md` and environment comments

### 2. LM Studio Availability
**Assumption:** Users can install and run LM Studio locally
**Validation:** Provided installation instructions and connection verification steps
**Fallback:** System supports multiple providers (Ollama, WebLLM, Transformer.js)

### 3. Structured Output Failures Acceptable
**Assumption:** Operations requiring JSON schemas may fail with 3B model
**Justification:** Resource constraints outweigh feature completeness for current phase
**Evidence:** APPROACH.md documents this limitation extensively
**User Impact:**
- Intent detection may default to 'other'
- Chart generation may fail
- Retry logic mitigates partial failures

### 4. OpenAI API Compatibility
**Assumption:** LM Studio's OpenAI-compatible API is stable and complete
**Validation:** Using `@ai-sdk/openai` package with custom baseURL
**Testing:** Verified streaming, chat completions, and model listing endpoints

### 5. Single Model for All Operations
**Assumption:** One default model sufficient for all LLM tasks
**Current State:** `lmstudio/ministralai/ministral-3-3b` used universally
**Future:** Model-per-task configuration possible via existing architecture

## Known Issues & Limitations

**Structured Output Failures** (3B model limitation)
- **Symptom:** `AI_APICallError: Invalid JSON response`
- **Affected:** Intent detection, chart generation
- **Fix:** Upgrade to Mistral-7B or Llama-3.2-8B

## Migration Path (Azure → Local)

### Before
```typescript
// Hardcoded throughout codebase
const model = 'azure/gpt-5-mini';
```

### After
```typescript
// Centralized configuration
import { getDefaultModel, resolveModel } from '@qwery/agent-factory-sdk';
const model = await resolveModel(getDefaultModel());
```

### Benefits
- ✅ Environment-driven configuration
- ✅ Easy model switching (no code changes)
- ✅ Support for nested model paths (`provider/org/model`)
- ✅ Consistent across 17 files