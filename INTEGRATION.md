# Qwery Local LLM Integration - llama.cpp

This integration enables Qwery to use a local Large Language Model via `llama.cpp` server, satisfying the requirements of the Guepard Internship Technical Assessment.

## Local LLM Integration Details

### Selected Model
- **Engine**: [llama.cpp](https://github.com/ggerganov/llama.cpp)
- **Integration Method**: Custom `LanguageModelV1` implementation in `packages/agent-factory-sdk`.
- **Reasoning**: To strictly follow the "no cloud SDKs" and "no API key" constraints, I implemented a native `fetch`-based provider that communicates directly with the `llama.cpp` server's OpenAI-compatible HTTP API. This avoids the need for the `@ai-sdk/openai` package and its required API key.

### Configuration

The integration adds the following environment variables to `.env`:

```bash
# Local LLM Config
LLAMA_CPP_BASE_URL=http://127.0.0.1:8080/v1
LLAMA_CPP_MODEL=llama-cpp-model
```

Cloud-based secrets (Azure OpenAI) have been removed from the environment configuration to ensure a fully local setup.

## Instructions to Run

1.  **Start llama.cpp Server**:
    Download a GGUF model (e.g., Llama-3-8B-Instruct) and start the server:
    ```bash
    ./llama-server -m models/llama-3-8b-instruct.Q4_K_M.gguf -c 2048 --port 8080
    ```

2.  **Configure Environment**:
    Ensure the `.env` file in the root directory reflects your `llama.cpp` server address and model name.

3.  **Run Qwery**:
    ```bash
    pnpm install
    pnpm dev
    ```

4.  **Use the Provider**:
    In the Qwery interface, configure your agents/workspaces to use the `llama-cpp` provider. For example, use the model string `llama-cpp/llama-3-8b-instruct`.

## Modified Files

- `packages/agent-factory-sdk/src/services/models/llama-cpp-model.provider.ts`: [NEW] Custom provider implementation.
- `packages/agent-factory-sdk/src/services/model-resolver.ts`: [MODIFY] Fixed hardcoded Azure dependencies by implementing `getDefaultModel()`.
- `packages/agent-factory-sdk/src/agents/actors/*`: [MODIFY] Updated background actors to use the local LLM by default.
- `packages/agent-factory-sdk/src/index.ts`: [MODIFY] Updated UI model list to prioritize Local LLM.
- `.env`: [MODIFY] Added local LLM configuration and removed cloud secrets.

## Build Status

- [x] **Web App Build**: Passed (`cd apps/web && pnpm build`)
- [x] **Extensions Build**: Passed (`pnpm extensions:build`)
- [x] **Project Dependencies**: Installed (`pnpm install`)
- [x] **Code Quality**: `llama-cpp` provider registered and type-checked.

## Assumptions
- The `llama.cpp` server is expected to be running and accessible at the URL provided in `LLAMA_CPP_BASE_URL`.
- The server provides an OpenAI-compatible `/chat/completions` endpoint (standard for current `llama.cpp` versions).
