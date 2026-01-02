# Local LLM Integration – llama.cpp Provider

This document describes the integration of a **local open-source LLM (llama.cpp)** into Qwery’s existing model provider architecture, replacing any cloud-based LLM dependency.

---

## Local LLM Used

**llama.cpp (server mode)**  
A fully local, open-source LLM runtime exposing an **OpenAI-compatible HTTP API**.

For this assessment, the following model was used:

- **Model**: Mistral-7B-Instruct (GGUF)
- **Quantization**: Q4_K_M
- **Runtime**: llama.cpp

---

## How to Start the Local LLM

### 1. Install llama.cpp

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
make
   ```

2. **Download a model:**
   - Download a compatible model from Hugging Face or other sources
   - Place it in a models directory
    ```bash
    curl -L -o models/mistral-7b-instruct.gguf \
    https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf
    ```

3. **Start the server:**
   ```bash
   ./build/bin/llama-server \
  -m models/mistral-7b-instruct.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  --ctx-size 2048
   ```
   The server will start on `http://localhost:8080` by default.

## Environment Variables

Add the following environment variables to your `.env.exemple` file:

```env
# LlamaCpp Local LLM Configuration
LOCAL_LLM_PROVIDER=llamacpp
LOCAL_LLM_BASE_URL=http://localhost:8080
LOCAL_LLM_MODEL=mistral-7b-instruct
```

### Environment Variable Details

- `LOCAL_LLM_PROVIDER`: Selects the local model provider (llamacpp)
- `LOCAL_LLM_BASE_URL`: Base URL of the local llama.cpp HTTP server
- `LOCAL_LLM_MODEL`: Model name used by Qwery
No cloud-related environment variables (Azure/OpenAI) are required or used.

## How the Provider Works

The LlamaCpp provider integrates with Qwery's existing model provider architecture:

1. Qwery resolves the model using the provider identifier llamacpp
2. The provider is implemented using @ai-sdk/openai with a custom baseURL
3. Requests are sent directly to the local llama.cpp HTTP server
4. Responses are returned using Qwery’s existing LanguageModel abstraction

This integration uses real HTTP calls and does not rely on mocks or cloud APIs.

## Usage

To use the local LLM provider, specify the model in the format:
```
llamacpp/<model-name>
```
For example: `llamacpp/mistral-7b-instruct`

## Modified Files

The following files were modified or created:

1. **packages/agent-factory-sdk/package.json**
   - Added `@ai-sdk/openai` dependency

2. **packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts** (NEW)
   - New provider implementation for LlamaCpp

3. **packages/agent-factory-sdk/src/services/model-resolver.ts**
   - Added `llamacpp` case to the provider switch statement
   - Updated error message to include `llamacpp` in available providers

4. **packages/agent-factory-sdk/src/services/index.ts**
   - Exported the new llamacpp-model.provider

5. **packages/agent-factory-sdk/src/index.ts**
   - Added LlamaCpp model to `SUPPORTED_MODELS` list

6. **apps/web/.env.example**
   - Added local LLM environment variables

## Build Validation

To validate the integration:

1. **Build Extensions:**
   ```bash
   pnpm extensions:build
   ```
2. **Build the Web App:**
   ```bash
   cd apps/web
   pnpm build
   ```
   ✅ Both commands complete successfully. The build may produce warnings, but no errors.

3. **Type Checking:**
   The new provider files pass all linting checks and follow the same patterns as existing providers (Ollama, Azure, etc.).

## Error Handling

The provider includes graceful error handling:
- If the model name is missing, a clear error message is provided
- If the local LLM server is not running, the AI SDK will handle connection errors appropriately
- The provider validates required configuration before attempting to connect

## Assumptions Made

1. **OpenAI-Compatible API**: The local llama.cpp server provides an OpenAI-compatible API endpoint
2. **Default Port**: The default server port is 8080, but this can be configured via `LOCAL_LLM_BASE_URL`
3. **No Authentication**: Local servers typically do not require authentication 
4. **Model Format**: Local servers typically do not require authentication

## Testing

To test the integration:

1. Start your local llama.cpp server
2. Set the environment variables
3. Use the model string `llamacpp/mistral-7b-instruct` in Qwery's agent configuration
4. Verify that prompts are sent to the local server and responses are received

## Notes

- This integration removes the dependency on cloud APIs (Azure OpenAI) for local development
- The provider follows the same interface pattern as other existing Qwery providers
- All inference requests are executed locally

