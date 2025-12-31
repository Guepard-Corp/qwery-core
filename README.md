# Local LLM Integration

Run Qwery entirely offline with local LLM support using llama.cpp.

## Quick Start

### 1. Start the Local LLM Server

```bash
cd llama-docker
docker-compose build --no-cache
docker-compose up -d
```

Verify it's running:
```bash
docker ps
docker logs -f [container-name]
```

### 2. Configure Environment Variables

Add to your `.env` file:
```env
LLAMACPP_BASE_URL=http://127.0.0.1:8080
LLAMACPP_MODEL_NAME=mistral-7b-instruct-v0.2.Q2_K.gguf
```

### 3. Run Qwery

```bash
pnpm install
cd apps/web
pnpm build
cd ../..
pnpm extensions:build
pnpm --filter web dev
```

The LlamaCpp model will be automatically selected if Azure credentials are not configured.

## Model Information

**Current Model:** Mistral 7B Instruct v0.2 (Q2_K quantized)

- **Purpose:** Lightweight demonstration model for technical validation
- **Size:** ~2.5GB (Q2_K quantization)
- **Capabilities:** Basic chat, greetings, simple Q&A
- **Limitations:** No tool calling, no structured outputs (model limitation, not integration)

### Upgrading the Model

To use a more capable model (Llama 3.1+, Qwen 2.5, Mistral v0.3+):

1. Download your preferred `.gguf` model file
2. Replace the model in `llama-docker/Dockerfile` or mount it via volume
3. Update `LLAMACPP_MODEL_NAME` in `.env`
4. Restart the Docker container

**Recommended for full features:** Llama 3.1 8B Instruct or larger (supports tool calling and system messages)

## How the Provider Works

### Architecture

```
User Query → Model Resolver → LlamaCpp Provider → llama.cpp Server → Model Response
```

1. **Provider Implementation:** Uses Vercel AI SDK's OpenAI adapter with custom `baseURL`
2. **API Compatibility:** llama.cpp exposes OpenAI-compatible `/v1/chat/completions` endpoint
3. **Local Execution:** All inference happens locally on port 8080
4. **No Cloud Calls:** Zero external dependencies when using LlamaCpp

### Code Integration

The provider is integrated into Qwery's existing model resolution system:

```typescript
// Automatic fallback to LlamaCpp when Azure credentials are missing
function getModel(): string {
  const hasAzureCreds = 
    !!process.env.AZURE_API_KEY && !!process.env.AZURE_RESOURCE_NAME;
  return hasAzureCreds 
    ? 'azure-openai/gpt-4' 
    : 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf';
}
```

**Key Files:**
- `packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts` - Provider implementation
- `packages/agent-factory-sdk/src/services/model-resolver.ts` - Model routing logic
- `llama-docker/` - Docker configuration for llama.cpp server

## Troubleshooting

**Container not starting?**
```bash
docker logs [container-name]
```

**Connection refused?**
- Verify Docker container is running: `docker ps`
- Check port 8080 is available: `netstat -an | findstr :8080` (Windows)

**Model not responding?**
- Test endpoint directly:
```bash
curl http://127.0.0.1:8080/v1/chat/completions ^
  -H "Content-Type: application/json" ^
  -d "{\"model\":\"mistral-7b-instruct-v0.2.Q2_K.gguf\",\"messages\":[{\"role\":\"user\",\"content\":\"test\"}]}"
```

## Learn More

For detailed integration documentation, see [INTEGRATION.md](INTEGRATION.md).
