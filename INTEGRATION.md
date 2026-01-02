itegration.md:
# LlamaCpp Local LLM Integration

## Overview

This integration adds a local LlamaCpp provider to Qwery, enabling the application to run without Azure OpenAI or other cloud-based LLM dependencies. The implementation uses Mistral 7B Instruct v0.2 (Q2_K quantized) as a lightweight model for technical demonstration purposes.

**Key Points:**
- Integration adds local LlamaCpp provider to replace Azure OpenAI
- Uses Mistral 7B Instruct v0.2 (Q2_K quantized) for demonstration
- Lightweight model chosen for technical demonstration and ease of setup
- **Architecture is model-agnostic** and supports swapping models without code changes

## Local LLM Setup

### Model Specifications
- **Model:** Mistral 7B Instruct v0.2 (Q2_K)
- **Framework:** llama.cpp
- **Endpoint:** http://127.0.0.1:8080
- **Docker Setup:** Located in `llama-docker/` folder

### Architecture Flexibility
The integration is **model-agnostic**. To use a more capable model (Llama 3.1+, Qwen 2.5, Mistral v0.3+), simply replace the `.gguf` file in the Docker setup. The provider architecture remains unchanged.


### Starting the Local LLM

1. Navigate to the Docker folder and start the container:
```bash
cd llama-docker
docker-compose build --no-cache
docker-compose up -d
```

2. Monitor logs to ensure the model is loaded:
```bash
docker logs -f [container-name]
```

3. Verify the endpoint is responding:
```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "mistral-7b-instruct-v0.2.Q2_K.gguf",
    "messages": [{"role": "user", "content": "test"}]
  }'
```

You should receive a JSON response with the model's output.

## Environment Variables

Copy the example environment file in `apps/cli`:
```bash
cd apps/cli
cp .env.example .env
```

Copy the example environment file in `apps/web`:
```bash
cd apps/web
cp .env.example .env
```

If you changed the model loaded in the Dockerfile, update this variable in your `.env`:
```env
LLAMACPP_MODEL_NAME=your-model-name.gguf
```


## Build and Run Instructions

1. Install dependencies:
```bash
pnpm install
```

2. Build core packages (should be built from the root; may show errors for desktop and cli packages at the end, which can be ignored):
```bash
pnpm build
```

3. Build the web application:
```bash
cd apps/web
pnpm build
cd ../..
```

4. Build extensions:
```bash
pnpm extensions:build
```

5. Start the development server:
```bash
pnpm --filter web dev
```
or 
```bash
cd apps/web
pnpm dev
```

The LlamaCpp model will be automatically selected if Azure credentials are not configured.



## Files Modified/Created

### New Files
- **`packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts`**  
  Provider implementation for LlamaCpp integration. Configures the OpenAI-compatible client to point to the local llama.cpp endpoint.

- **`llama-docker/`**  
  Docker configuration for running llama.cpp server locally with the Mistral 7B model with readme file explaining the setup.

### Modified Files
- **`packages/agent-factory-sdk/src/services/model-resolver.ts`**  
  Added `llamacpp` case to the provider switch statement to enable model resolution for LlamaCpp models.

- **`packages/agent-factory-sdk/src/index.ts`**  
  Exported the new LlamaCpp provider for use across the application.

- **`apps/web/.env.example`**  
  Added `LLAMACPP_BASE_URL` environment variable configuration.
  and `LLAMACPP_MODEL_NAME` 
- **Multiple actor files:**
  - `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts`
  - `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts`
  - `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts`
  - `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts`
  - `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts`
  - `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts`

  
  **Note:** These modifications add fallback logic to use LlamaCpp when Azure 
  credentials are not configured. This ensures the application can function 
  without cloud dependencies while maintaining backward compatibility.


## Model Capabilities & Architectural Considerations

### Demonstration Model Choice
For this integration, **Mistral 7B v0.2 was chosen as a lightweight model to demonstrate the technical integration and provider architecture**. This model supports basic chat conversations, which is sufficient to validate the integration pattern.

### Supported Features
✅ Basic chat and conversations  
✅ Greetings and simple queries  
✅ Text generation  
✅ Simple question answering  
✅ System information responses  

### Limited Features
⚠️ **Tool calling** requires models with system message support (not available in Mistral 7B v0.2)  
⚠️ **Chart generation** (requires tools)  
⚠️ **Complex data operations** (any feature requiring tools)  
⚠️ **Multi-turn conversations with tools**  

### Root Cause
Mistral 7B v0.2's chat template only accepts `user` and `assistant` roles. When the AI SDK uses:
- `generateObject()` → internally adds `system`/`tool` roles for structured output
- `streamText()` with `tools` parameter → adds `tool` role messages
- System prompts → adds `system` role messages

The llama.cpp server rejects these with: **"Only user and assistant roles are supported!"**

This means:
- ❌ Data queries fail → Can't execute SQL or access databases
- ❌ Chart generation fails → Can't generate visualizations
- ✅ Basic chat works → Simple user/assistant text exchanges only

### Architecture Flexibility as a solution
The integration is **model-agnostic**. To use a more capable model (Llama 3.1+, Qwen 2.5, Mistral v0.3+), simply replace the `.gguf` file in the Docker setup. The provider architecture remains unchanged.

### Upgrading the Model

To use a more capable model (Llama 3.1+, Qwen 2.5, Mistral v0.3+):

1. Open `llama-docker/Dockerfile` and update these two sections with your preferred model (keep in mind resource constraints):

**Download section** - Change the model URL and filename:
```dockerfile
RUN echo "Downloading Mistral 7B model..." && \
    curl -L -o /app/models/...gguf \
    https://huggingface.co/TheBloke/...gguf && \
    echo "Model downloaded successfully!"
```

**CMD section** - Update the model path:
```dockerfile
CMD ["/app/llama.cpp/build/bin/llama-server", "-m", "/app/models/...", "--host", "0.0.0.0", "--port", "8080", "-c", "8192", "-b", "512", "--threads", "8", "--no-mmap"]
```

2. Update `LLAMACPP_MODEL_NAME` in your `apps/web/.env` file to match the new model filename

3. Rebuild and restart the Docker container:
```bash
cd llama-docker
docker-compose build --no-cache
docker-compose up -d
```

**Recommended Models for Full Feature Support:**
- Llama 3.1 8B Instruct or larger
- Qwen 2.5 7B Instruct or larger
- Mistral v0.3 7B Instruct or larger

These models include better chat templates that support system messages and tool calling, enabling the full feature set of Qwery.

## Technical Approach


### Implementation Details
- **SDK:** Uses Vercel AI SDK with `@ai-sdk/openai` adapter
- **API Compatibility:** Leverages llama.cpp's OpenAI-compatible API (`/v1/chat/completions`)
- **Configuration:** Custom `baseURL` points to local endpoint
- **Pattern:** Follows the same pattern as the Ollama provider
- **Execution:** 100% local execution with no cloud API calls

### Provider Architecture
```typescript
// LlamaCpp provider uses OpenAI adapter with custom baseURL
const provider = createOpenAI({
  baseURL: `${baseURL}/v1`,
  apiKey: 'not-needed',
});
```

### Fallback Logic
All actors and services implement Azure-first logic with automatic fallback:
```typescript
function getModel(): string {
  const hasAzureCreds =
    !!process.env.AZURE_API_KEY && !!process.env.AZURE_RESOURCE_NAME;
  const llamacppModel = process.env.LLAMACPP_MODEL_NAME 
    ? `llamacpp/${process.env.LLAMACPP_MODEL_NAME}`
    : 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf';
  return hasAzureCreds ? DEFAULT_AZURE_MODEL : llamacppModel;
}
```

## Integration Architecture

### Design Principles
- **Implements existing provider interface** - No breaking changes to the provider contract
- **Registered in model-resolver switch** - Seamlessly integrated with existing provider resolution
- **Added to SUPPORTED_MODELS array** - Available in model selection dropdowns
- **Server-side execution** - Uses default transport mechanism
- **No modifications to existing providers** - Azure, Ollama, and other providers remain unchanged

### Code Flow
1. User selects model → 2. Model resolver parses `llamacpp/model-name` → 3. Routes to LlamaCpp provider → 4. Provider creates OpenAI client with custom baseURL → 5. Requests sent to local llama.cpp server

## Testing

### How to Test in Qwery

1. **Start Docker Container**

2. **Build and Run Development Server**

3. **Create New Project**

4. **Select LlamaCpp Model**
   - Open model dropdown
   - Select "Mistral 7B Instruct (Local)" chosen by default 

5. **Test with Simple Queries**
   - Start with basic queries: "Hello", "Who are you?", "What can you do?"
   - Test text generation: "Write a short poem about coding"
   - **Note:** Avoid queries that require data access, tool calling, or chart generation

### Expected Behavior
- ✅ Simple chat messages should receive responses
- ✅ System info queries should work ("who are you?")
- ✅ Any querie with intent( other ) should work ("who are you?")
- ❌ Complex queries requiring tools may fail gracefully

## Assumptions

The integration was built with the following assumptions:

1. **llama.cpp runs on port 8080** - Default port configuration
2. **Docker available and running on system** - Docker service is installed and actively running to host the llama.cpp server
3. **Model pre-downloaded in Docker image** - No runtime download required
4. **OpenAI-compatible format acceptable** - Uses standard OpenAI API schema
5. **Server-side execution appropriate** - No client-side inference needed
6. **Local network access** - Application can reach `127.0.0.1:8080`
7. **Node.js (version 22.20.0 >18)** - Required for running the application
8. **pnpm (version 10.18.1)** - Package manager version for dependency management

## Confirmation

✅ **Local LLM used** (not mocked) - Real llama.cpp integration  
✅ **No cloud dependencies** - Runs entirely offline  
✅ **Code compiles and builds successfully** - All type checks pass  
✅ **Clean architecture integration** - Follows existing patterns  
✅ **Docker setup included** - Ready-to-use container configuration  
✅ **Environment variables documented** - Clear setup instructions  
✅ **Provider architecture validated** - Successfully tested with real model

## Troubleshooting

**React Router Version Conflict Error?**

If all builds pass successfully but when you run:
```bash
cd apps/web
pnpm dev
```

You encounter errors like:
```
X [ERROR] No matching export in "react-router" for import "UNSAFE_useRoutesImpl"
X [ERROR] No matching export in "react-router" for import "UNSAFE_useRouteId"
X [ERROR] No matching export in "react-router" for import "AbortedDeferredError"
X [ERROR] No matching export in "react-router" for import "defer"
X [ERROR] No matching export in "react-router" for import "json"
```

**Solution:**

1. Update `package.json` in the root repository:

```json
"pnpm": {
  "overrides": {
    "react-is": "19.0.0",
    "react-router": "7.9.5",
    "react-router-dom": "npm:empty-npm-package@1.0.0",
    "@react-router/dev": "7.9.5",
    "@react-router/node": "7.9.5",
    "@react-router/serve": "7.9.5",
    "@react-router/express": "7.9.5",
    "@react-router/fs-routes": "7.9.5"
  },
```

2. Update `apps/web/vite.config.ts` to add resolve alias:

```typescript
export default defineConfig(({ command }) => ({
  resolve: {
    alias: {
      'react-router-dom': 'react-router',
    },
  },
  ssr: {
    noExternal:
      command === 'build'
        ? true
        : ['posthog-js', '@posthog/react', 'streamdown'],
    external: [
      'better-sqlite3',
      '@duckdb/node-api',
      '@duckdb/node-bindings-linux-arm64',
      '@duckdb/node-bindings-linux-x64',
      '@duckdb/node-bindings-darwin-arm64',
      '@duckdb/node-bindings-darwin-x64',
      '@duckdb/node-bindings-win32-x64',
    ],
  },
```

3. Reinstall dependencies:
```bash
pnpm install
```
5. Rebuild
4. Try running the dev server again:
```bash
cd apps/web
pnpm dev
```

**Build Errors in `apps/web`?**

If you encounter this error when running `pnpm build` in `apps/web`:

```
ERROR  run failed: command  exited (1)
ELIFECYCLE  Command failed with exit code 1.
```

**Solution:**

Try running `pnpm build` from the root repository first, as some packages may not have built successfully (even if you've done it before):

```bash
# From root directory
pnpm build
```

Then rebuild in `apps/web`:
```bash
cd apps/web
pnpm build
```

**Root Build Shows Failures?**

If running `pnpm build` at the root shows failures like this it's normal but the problem is the number of successful tasks:

```
Tasks:    3 successful, 13 total
Cached:    3 cached, 13 total
  Time:    4.364s
Failed:    desktop#build

ERROR  run failed: command  exited (1)
ELIFECYCLE  Command failed with exit code 1.
```

This means packages didn't build successfully (tasks < 6 successful). The `apps/web` build will not pass in this state.

**Solution:**

Rebuild from the root until you get more than 6 successful tasks:

```bash
# From root directory
pnpm build
```

Once you see sufficient successful tasks (e.g., 6+ successful), then rebuild `apps/web`:

```bash
cd apps/web
pnpm build
```

### Common Issues

**Error: "ECONNREFUSED 127.0.0.1:8080"**
- Ensure Docker container is running: `docker ps`
- Check logs: `docker logs [container-name]`
- Verify port 8080 is not in use by another service

**Error: "Only user and assistant roles are supported"**
- This is a Mistral 7B v0.2 limitation
- The model doesn't support system messages or tool calling
- Consider upgrading to a more capable model (Llama 3.1+)
- For now, use only basic chat features

**Error: "Title generation timeout"**
- Increased timeout to 50 seconds in latest version
- Local inference can be slower than cloud APIs
- Consider using a faster model or GPU acceleration

**Model responses are slow**
- Q2_K quantization prioritizes size over speed
- Consider Q4 or Q5 quantization for better performance
- Enable GPU acceleration in Docker if available

## Future Improvements

1. **Model Upgrade**: Replace Mistral 7B v0.2 with Llama 3.1 8B for full feature support
2. **GPU Support**: Add CUDA/ROCm support to Docker configuration
3. **Model Hot-Swapping**: Allow runtime model changes without restart
4. **Quantization Options**: Provide multiple quantization levels (Q2, Q4, Q8)
5. **Performance Metrics**: Add inference time and token/s monitoring
6. **Fallback Chain**: Implement automatic fallback through multiple providers

## Conclusion

This integration demonstrates Qwery's architectural flexibility and commitment to privacy-first, local-first AI capabilities. While the current Mistral 7B v0.2 model has limitations, the provider infrastructure is production-ready and can support any llama.cpp-compatible model without code changes.

For production deployments requiring full feature support, we recommend upgrading to Llama 3.1 8B or larger models that support tool calling and structured outputs.
