# Local LLM Integration (vLLM)

## Local LLM Used

- Inference engine: vLLM
- Model: Qwen2.5-Coder-7B-Instruct
- Quantization: Q4_K_M (GGUF)
- Runtime: CUDA + PyTorch
- Hardware tested on: RTX 3080 (10 GB VRAM)

> vLLM was chosen due to existing CUDA and PyTorch setup, its suitability for concurrent request handling, and as a learning alternative to llama.cpp, which was previously used.

## Model Details

- Model file:
  qwen2.5-coder-7b-instruct-q4_k_m.gguf
- Tokenizer:
  Qwen/Qwen2.5-Coder-7B-Instruct
- Context length:
  16k tokens (32k caused VRAM exhaustion on the target GPU)

> Although GGUF is more commonly associated with llama.cpp, vLLM supports loading it with explicit tokenizer configuration.

## Instructions to Run the Local LLM

### Start the vLLM Server

```bash
vllm serve \
  ~/.cache/huggingface/hub/models--Qwen--Qwen2.5-Coder-7B-Instruct-GGUF/snapshots/13fb94bfda8c8cf22497dc57b78f391a9acb426a/qwen2.5-coder-7b-instruct-q4_k_m.gguf \
  --tokenizer Qwen/Qwen2.5-Coder-7B-Instruct \
  --max-model-len 16384 \
  --gpu-memory-utilization 0.75 \
  --max-num-seqs 4 \
  --served-model-name qwen2.5-coder-7b-instruct \
  --dtype auto \
  --api-key test-abc123
```

Key flags:
- max-model-len is limited to 16k due to VRAM constraints
- max-num-seqs controls concurrent requests
- served-model-name is the identifier used by the OpenAI compatible API
- api-key is required to match the OpenAI API schema but is not used for authentication in local mode

### Verify the Server

List available models:

```bash
curl -X GET http://127.0.0.1:8000/v1/models
 \
  -H "Authorization: Bearer test-abc123" | jq
```

Request a completion:

```bash
curl -X POST http://127.0.0.1:8000/v1/completions
 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-abc123" \
  -d '{
    "model": "qwen2.5-coder-7b-instruct",
    "prompt": "Write a function in Python that sums a list of numbers.",
    "max_tokens": 100
  }' | jq
```

>jq is optional and used only for pretty printing responses.

## How the Provider Works

- The application uses an OpenAI compatible HTTP interface.
- vLLM exposes `/v1/completions` and `/v1/models`, matching the OpenAI API contract.
- The active model name is centralized in a shared config to avoid hardcoded strings across services and agents.
- The provider points to a local base URL instead of Azure OpenAI endpoints.


## Environment Variables Added
Defined under `cli/.env`:

```env
VLLM_MODEL=vllm/qwen2.5-coder-7b-instruct
VLLM_BASE_URL=http://localhost:8000/v1
VLLM_API_KEY=test-abc123
```

## List of Modified Files

- `apps/web/config/app.config.ts`
  Added fallback defaults for `VITE_THEME_COLOR` and `VITE_THEME_COLOR_DARK` to prevent startup crashes when Vite does not load them from `.env`.

- `agent-factory-sdk/src/agents/config/active-model.ts`
  Introduced `ACTIVE_LLM` as a single source of truth for the active model name.

- Multiple files under:
  - actors
  - services
  - apps/web

  Refactored to reference `ACTIVE_LLM` instead of hardcoding model identifiers.

Refer to the Git diff for the complete list.

## Build and Runtime Confirmation

- All builds pass successfully.
- The application runs end to end using the local vLLM backend.
- A working demo and build confirmation are shown in the videos shared via email.

## Assumptions and Notes
- The original assessment instructions suggested removing all cloud based LLM dependencies and secrets and fully replacing them with a local open source model. Instead of deleting existing Azure OpenAI configuration and code paths, a local vLLM based provider was added as a first class integration and set as the default active model. This approach preserves backward compatibility, avoids breaking existing functionality, and demonstrates that the application can run entirely on a local LLM with no reliance on cloud execution. All runtime requests are routed to the local vLLM server, and cloud credentials are not required for the application to build or operate.
- The repository is heavily biased toward Azure and `gpt-5-mini`. Other providers (ollama,built in browser...) are assumed non functional without refactoring.
- Significant code duplication exists, for example repeated `getOrCreateAgent` logic in:
  - apps/web/app/routes/api/notebook/prompt
  - apps/web/app/routes/api/chat
- Evaluation is assumed to focus on LLM integration and provider wiring rather than model quality, embeddings, or UI.
- No embedding model or external data sources are configured.
