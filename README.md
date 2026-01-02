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

### 3. Run Qwery

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

## Model Information

**Current Model:** Mistral 7B Instruct v0.2 (Q2_K quantized)

- **Purpose:** Lightweight demonstration model for technical validation
- **Size:** ~2.5GB (Q2_K quantization)
- **Capabilities:** Basic chat, greetings, simple Q&A
- **Limitations:** No tool calling, no structured outputs (model limitation, not integration)

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
  const llamacppModel = process.env.LLAMACPP_MODEL_NAME 
    ? `llamacpp/${process.env.LLAMACPP_MODEL_NAME}`
    : 'llamacpp/mistral-7b-instruct-v0.2.Q2_K.gguf';
  return hasAzureCreds ? DEFAULT_AZURE_MODEL : llamacppModel;
}
```

**Key Files:**
- `packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts` - Provider implementation
- `packages/agent-factory-sdk/src/services/model-resolver.ts` - Model routing logic
- `llama-docker/` - Docker configuration for llama.cpp server

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

For more information about the dockerization of the server and model, check the [llama-docker/README.md](llama-docker/README.md) file.

