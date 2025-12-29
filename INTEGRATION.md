# Local LLM Integration (Llama.cpp)

This integration enables Qwery to run entirely offline using a local LLM via `llama.cpp`.

## 🧠 Local LLM Used
- **Provider**: `llama.cpp` (server mode)
- **Model**: Mistral 7B Instruct v0.2 (`mistral-7b-instruct-v0.2.Q4_K_M.gguf`)
- **Reasoning**: Chosen for its balance of performance and resource usage (4-bit quantization), fitting comfortably within typical local development environments while supporting 4k context.

## 🚀 Instructions to Run

### 1. Start Local LLM
Ensure `llama-server` is running with a Mistral-compatible model.

```bash
# From your llama.cpp directory
./llama-server -m models/mistral-7b-instruct-v0.2.Q4_K_M.gguf -c 4096 --port 8000
```
- **Port**: 8000 (Default)
- **Context**: 4096 (Required for data processing tasks)

### 2. Configure Environment
Copy `.env.example` to `.env` in `apps/web/` and configure:

```env
# Enable Local LLM
VITE_AGENT_PROVIDER=llamacpp

# Llama.cpp Configuration
LLAMACPP_BASE_URL=http://localhost:8000
LLAMACPP_MODEL=mistral
```

### 3. Run Qwery
```bash
# From repository root
pnpm extensions:build

# From apps/web
cd apps/web
pnpm dev
```

## 🔧 Modified Files

| File | Description |
|------|-------------|
| `packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts` | **New Provider**: Implements `ModelProvider` for `llama.cpp`'s OpenAI-compatible API. handles strict user/assistant role alternation and streaming. |
| `packages/agent-factory-sdk/src/services/model-resolver.ts` | **Resolver Logic**: Added `llamacpp` case. Removed `azure` provider logic. |
| `packages/agent-factory-sdk/src/services/models/azure-model.provider.ts` | **Deleted**: Removed to satisfy "No cloud LLM dependency remains" requirement. |
| `packages/agent-factory-sdk/src/services/index.ts` | **Cleanup**: Removed Azure provider export. |
| `apps/web/.env.example` | **Config**: Added local LLM variables, removed Azure examples. |

## ✅ Verification
All builds passed successfully:
- `apps/web`: `pnpm build` ✅
- Root: `pnpm extensions:build` ✅

## 📝 Assumptions
- The user has `llama-server` installed and a compatible GGUF model available.
- The local LLM server is accessible at `http://localhost:8000`.
- 4096 token context is sufficient for the provided test cases.
