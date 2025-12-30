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

## Files Modified/Created

### New Files
- **`packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts`**  
  Provider implementation for LlamaCpp integration. Configures the OpenAI-compatible client to point to the local llama.cpp endpoint.

- **`llama-docker/`**  
  Docker configuration for running llama.cpp server locally with the Mistral 7B model.

### Modified Files
- **`packages/agent-factory-sdk/src/services/model-resolver.ts`**  
  Added `llamacpp` case to the provider switch statement to enable model resolution for LlamaCpp models.

- **`packages/agent-factory-sdk/src/index.ts`**  
  Exported the new LlamaCpp provider for use across the application.

- **`.env`**  
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

## Environment Variables

Add the following to your `.env` file:

```env
LLAMACPP_BASE_URL=http://127.0.0.1:8080
LLAMACPP_MODEL_NAME=mistral-7b-instruct-v0.2.Q2_K.gguf
```

**Optional:** If Azure credentials are not set, the system automatically falls back to LlamaCpp:
```env
# Leave these unset to use LlamaCpp by default
# AZURE_API_KEY=
# AZURE_RESOURCE_NAME=
```

## Build Instructions

### Install dependencies
```bash
pnpm install
```

### Build Web Application
```bash
cd apps/web
pnpm build 
```

### Build Extensions
```bash
pnpm extensions:build
```

Both builds should pass successfully with no errors.

### Run Development Server
```bash
cd apps/web
pnpm dev
```



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
⚠️ **Structured output generation** (`generateObject`) - affects intent detection  
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
- ❌ Intent detection fails → Can't route requests properly
- ❌ Data queries fail → Can't execute SQL or access databases
- ❌ Chart generation fails → Can't generate visualizations
- ✅ Basic chat works → Simple user/assistant text exchanges only

### Architecture Flexibility as a solution
The integration is **model-agnostic**. To use a more capable model (Llama 3.1+, Qwen 2.5, Mistral v0.3+), simply replace the `.gguf` file in the Docker setup. The provider architecture remains unchanged.

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
   ```bash
   cd llama-docker
   docker-compose up -d
   ```

2. **Build and Run Development Server**
   ```bash
   cd apps/web
   pnpm build
   cd ../..
   pnpm extensions:build
   pnpm --filter web dev
   ```

3. **Create New Project**
   - Open Qwery in your browser
   - Create a new project and conversation

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
- ❌ Complex queries requiring tools may fail gracefully
- ❌ Data source queries will not execute (model limitation)

## Assumptions

The integration was built with the following assumptions:

1. **llama.cpp runs on port 8080** - Default port configuration
2. **Docker available on system** - Required for running llama.cpp server
3. **Model pre-downloaded in Docker image** - No runtime download required
4. **OpenAI-compatible format acceptable** - Uses standard OpenAI API schema
5. **Server-side execution appropriate** - No client-side inference needed
6. **Local network access** - Application can reach `127.0.0.1:8080`

## Confirmation

✅ **Local LLM used** (not mocked) - Real llama.cpp integration  
✅ **No cloud dependencies** - Runs entirely offline  
✅ **Code compiles and builds successfully** - All type checks pass  
✅ **Clean architecture integration** - Follows existing patterns  
✅ **Docker setup included** - Ready-to-use container configuration  
✅ **Environment variables documented** - Clear setup instructions  
✅ **Provider architecture validated** - Successfully tested with real model
## Troubleshooting

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
