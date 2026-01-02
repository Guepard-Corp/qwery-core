# INTEGRATION.md - Local LLM Integration for Qwery Core

## Quick Reference

| Item | Details |
|------|---------|
| **Local LLM Used** | llama.cpp with TinyLlama 1.1B Chat (Q4_K_M quantization) |
| **Build Status** | PASSED - All builds complete successfully |
| **Cloud Dependencies** | REMOVED - All Azure OpenAI dependencies eliminated |
| **Architecture** | Dockerized microservice integrated via docker-compose |

---

## Executive Summary

This report documents the successful integration of a local open-source Large Language Model (llama.cpp) into the Qwery Core platform, replacing the cloud-based Azure OpenAI dependency. All cloud API requirements have been removed, and the application now operates entirely with a locally-hosted LLM.

The integration follows a microservice architecture pattern, containerizing the LLM server using Docker and orchestrating it alongside existing services through Docker Compose. This approach ensures consistency across development environments, simplifies deployment, and maintains separation of concerns between application logic and AI inference capabilities.

---

## 1. Local LLM Used

**Selected Solution:** llama.cpp

**Model:** TinyLlama 1.1B Chat (quantized Q4_K_M - `tinyllama-1.1b-chat-v1.0-q4_k_m.gguf`)

### Why llama.cpp?

llama.cpp was selected as the local LLM solution for the following reasons:

1. **OpenAI-Compatible API:** Provides a REST API at `/v1/chat/completions` that mirrors the OpenAI API specification, enabling seamless integration with existing code that expects OpenAI-style requests and responses.

2. **True Local Execution:** Runs entirely on the local machine without requiring any cloud connectivity, ensuring data privacy and eliminating external API costs.

3. **Model Flexibility:** Supports a wide variety of open-source models in the GGUF format, allowing users to swap models based on their hardware capabilities and use case requirements.

4. **Resource Efficiency:** Optimized C++ implementation with support for CPU inference using OpenBLAS, making it accessible on machines without dedicated GPU hardware.

5. **Assessment Compliance:** Satisfies the requirement to use a local open-source LLM other than Ollama.

### Why TinyLlama 1.1B?

TinyLlama was chosen as the default model because:
- Small model size (approximately 600MB quantized) suitable for development and testing
- Fast inference times on CPU hardware
- Sufficient capability for demonstrating the integration
- Can be replaced with larger models for production use cases

---

## 2. Instructions to Run the Solution

### Prerequisites
- Docker and Docker Compose installed
- Node.js and pnpm installed
- The model file `tinyllama-1.1b-chat-v1.0-q4_k_m.gguf` in `Local-AI-Server/models/`

### Step 1: Start the Local LLM Server (Docker)

```bash
# From repository root
docker-compose up -d llama-server

# Verify the server is running
docker-compose ps
docker-compose logs llama-server
```

### Step 2: Install Dependencies

```bash
pnpm install
```

### Step 3: Build the Project

```bash
# Build web application
cd apps/web
pnpm build

# Build extensions (from repository root)
cd ../..
pnpm extensions:build
```

### Step 4: Run Development Server

```bash
cd apps/web
pnpm dev
```

### Step 5: Access the Application

Open `http://localhost:3000` in your browser.

---

## 3. Environment Variables Added

**File:** `apps/web/.env`

```env
# AI LOCAL MODEL CONFIGURATION
VITE_DEFAULT_MODEL=local/default
LLAMACPP_BASE_URL=http://localhost:4040/v1
LLAMACPP_MODEL=tinyllama
```

| Variable | Description | Default Value |
|----------|-------------|---------------|
| `VITE_DEFAULT_MODEL` | Default model identifier used by the application | `local/default` |
| `LLAMACPP_BASE_URL` | Base URL for the llama.cpp server API | `http://localhost:4040/v1` |
| `LLAMACPP_MODEL` | Model name passed to the llama.cpp server | `tinyllama` |
| `LLAMA_THREADS` | Number of CPU threads for inference (optional) | `4` |

### Removed Cloud Variables

The following Azure OpenAI environment variables have been removed and are no longer required. This ensures the application operates independently of any cloud-based LLM services:

- `AZURE_API_KEY` - Previously used for Azure authentication
- `AZURE_RESOURCE_NAME` - Previously used to specify the Azure resource
- `AZURE_OPENAI_DEPLOYMENT` - Previously used to specify the deployment name

---

## 4. List of Modified Files

| File Path | Type of Change |
|-----------|----------------|
| `Local-AI-Server/Dockerfile` | **New** - Multi-stage Docker build for llama.cpp |
| `Local-AI-Server/entrypoint.sh` | **New** - Container entrypoint script |
| `Local-AI-Server/models/.gitkeep` | **New** - Placeholder for model directory |
| `Local-AI-Server/.gitignore` | **New** - Ignores large model files |
| `docker-compose.yml` | **Modified** - Added llama-server service |
| `packages/agent-factory-sdk/src/services/models/local-model.provider.ts` | **New** - Local model provider implementation |
| `packages/agent-factory-sdk/src/services/model-resolver.ts` | **Modified** - Added local provider case |
| `packages/agent-factory-sdk/src/index.ts` | **Modified** - Added `getDefaultModel()`, updated `SUPPORTED_MODELS` |
| `packages/agent-factory-sdk/package.json` | **Modified** - Added `@ai-sdk/openai` dependency |
| `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts` | **Modified** - Replaced hardcoded model |
| `packages/agent-factory-sdk/src/agents/actors/summarize-intent.actor.ts` | **Modified** - Replaced hardcoded model |
| `packages/agent-factory-sdk/src/agents/actors/system-info.actor.ts` | **Modified** - Replaced hardcoded model |
| `packages/agent-factory-sdk/src/agents/tools/generate-chart.ts` | **Modified** - Replaced hardcoded model |
| `packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts` | **Modified** - Replaced hardcoded model |
| `packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts` | **Modified** - Replaced hardcoded model |
| `apps/web/app/routes/api/chat.ts` | **Modified** - Updated imports and default model |
| `apps/web/app/routes/api/notebook/prompt.ts` | **Modified** - Updated imports and default model |
| `apps/web/components/agents-provider.tsx` | **Modified** - Updated imports and default model |
| `apps/web/app/routes/project/_components/agent-ui-wrapper.tsx` | **Modified** - Updated imports and default model |
| `apps/web/.env` | **Modified** - Added local LLM configuration |

---

## 5. Build Validation - All Builds Pass

Both mandatory build steps have been executed successfully, confirming that the integration does not introduce any compilation errors or dependency issues.

### Web Application Build

```bash
cd apps/web
pnpm build
```

**Status:** SUCCESSFUL

The web application builds without errors. This validates that all TypeScript imports, model provider references, and environment variable usage are correctly implemented.

### Extensions Build

```bash
pnpm extensions:build
```

**Status:** SUCCESSFUL

All extensions compile successfully, confirming that changes to the agent-factory-sdk package are compatible with dependent packages.

---

## 6. Assumptions Made

The following assumptions were made during the implementation. These should be reviewed and validated in the target deployment environment:

1. **Model File Availability:** The TinyLlama model file (`tinyllama-1.1b-chat-v1.0-q4_k_m.gguf`) is pre-downloaded and placed in `Local-AI-Server/models/`. Due to file size constraints (approximately 600MB), this file may need to be downloaded separately from Hugging Face or other model repositories.

2. **Docker Environment:** The solution assumes Docker and Docker Compose are installed and properly configured on the target system. The Docker daemon must be running for the llama-server container to start.

3. **Port Availability:** Port 4040 is assumed to be available for the llama.cpp server. If this port is in use by another service, the `PORT` environment variable can be modified accordingly.

4. **API Compatibility:** The `@ai-sdk/openai` package is used with the `.chat()` method to ensure compatibility with llama.cpp's OpenAI-compatible Chat Completions endpoint (`/v1/chat/completions`). This is necessary because the default Responses API endpoint is not supported by llama.cpp.

5. **Default Model Selection:** When no model is explicitly specified in API calls, the system defaults to `local/default`, which routes requests to the local llama.cpp server. This behavior can be overridden via environment variables.

6. **Environment Variable Precedence:** The `VITE_DEFAULT_MODEL` environment variable takes precedence for model selection in browser-side code. This follows Vite's convention for exposing environment variables to the client bundle.

7. **CPU-Only Inference:** The Docker setup uses CPU-only inference with OpenBLAS optimization. For production deployments requiring higher throughput, GPU acceleration can be enabled by modifying the Dockerfile to include CUDA or ROCm support.

---

## 7. Implementation Details

This section provides technical details on how the local LLM provider was integrated into Qwery's existing model provider architecture.

### 7.1 New Model Provider Implementation

**File:** `packages/agent-factory-sdk/src/services/models/local-model.provider.ts`

A new local model provider was implemented following the existing provider pattern. This provider:

- Connects to a locally running llama.cpp server using the OpenAI-compatible API
- Leverages the `@ai-sdk/openai` package configured with a custom base URL pointing to the local server
- Uses the `.chat()` method specifically to target the Chat Completions API endpoint, which is the endpoint implemented by llama.cpp
- Reads configuration from environment variables, allowing flexible deployment without code changes

```typescript
export function createLocalModelProvider({
  baseUrl = process.env.LLAMACPP_BASE_URL ?? 'http://localhost:4040/v1',
  defaultModel = process.env.LLAMACPP_MODEL ?? 'default',
}: LocalModelProviderOptions = {}): ModelProvider {
  const llamacpp = createOpenAI({
    baseURL: baseUrl,
    apiKey: 'not-needed',
  });

  return {
    resolveModel: (modelName) => {
      const finalModel = modelName || defaultModel;
      if (!finalModel) {
        throw new Error(
          "[AgentFactory] Missing llama.cpp model. Provide it as 'local/<model-name>' or set LLAMACPP_MODEL.",
        );
      }
      return llamacpp.chat(finalModel);
    },
  };
}
```

### 7.2 Model Resolver Integration

**File:** `packages/agent-factory-sdk/src/services/model-resolver.ts`

The model resolver acts as a factory that creates the appropriate model provider based on the model identifier prefix. A new `local` case was added to handle requests for local models. When a model identifier starts with `local/`, the resolver dynamically imports and instantiates the local model provider:

```typescript
case 'local': {
  const { createLocalModelProvider } = await import(
    './models/local-model.provider'
  );
  return createLocalModelProvider({
    defaultModel: getEnv('LLAMACPP_MODEL') ?? getEnv('LOCAL_MODEL') ?? modelName,
  });
}
```

This dynamic import pattern keeps the local provider code separate and only loads it when needed, reducing bundle size for deployments that may use other providers.

### 7.3 Default Model Configuration

**File:** `packages/agent-factory-sdk/src/index.ts`

A new `getDefaultModel()` function was added to centralize default model selection across the application. This function checks for an environment variable override and falls back to the local provider:

```typescript
export function getDefaultModel(): string {
  if (typeof process !== 'undefined' && process.env?.VITE_DEFAULT_MODEL) {
    return process.env.VITE_DEFAULT_MODEL;
  }
  return 'local/default';
}
```

This centralized approach ensures consistent model selection behavior and makes it easy to switch the default model for the entire application through a single environment variable.

---

## 8. Docker Integration

To ensure a clean microservice architecture and automated deployment, the local LLM was containerized using Docker and integrated into the existing Docker Compose configuration. This approach provides several benefits:

- **Consistency:** The same container runs identically across development, testing, and production environments
- **Isolation:** The LLM server runs in its own container with defined resource limits
- **Orchestration:** Docker Compose manages the lifecycle alongside other infrastructure services
- **Reproducibility:** The multi-stage Dockerfile ensures consistent builds from source

### 8.1 Local-AI-Server Folder Structure

A dedicated folder was created at the repository root to contain all Docker-related files for the LLM server:

```
Local-AI-Server/
├── Dockerfile          # Multi-stage build for llama.cpp server
├── entrypoint.sh       # Container entrypoint script
├── .gitignore          # Ignores large model files
└── models/
    ├── .gitkeep
    └── tinyllama-1.1b-chat-v1.0-q4_k_m.gguf
```

### 8.2 Docker Compose Service

**File:** `docker-compose.yml`

The llama.cpp server was added as a new service in the existing Docker Compose file, joining the other infrastructure services (PostgreSQL, MySQL, ClickHouse, MongoDB, MinIO). This integration follows the microservice architecture pattern already established in the project:

```yaml
llama-server:
  build:
    context: ./Local-AI-Server
    dockerfile: Dockerfile
  restart: unless-stopped
  env_file:
    - ./apps/web/.env
  environment:
    MODEL_PATH: /models/${LLAMACPP_MODEL:-tinyllama}-1.1b-chat-v1.0-q4_k_m.gguf
    LLAMA_THREADS: ${LLAMA_THREADS:-4}
    PORT: 4040
  ports:
    - "4040:4040"
  volumes:
    - ./Local-AI-Server/models/tinyllama-1.1b-chat-v1.0-q4_k_m.gguf:/models/tinyllama-1.1b-chat-v1.0-q4_k_m.gguf:ro
  healthcheck:
    test: ["CMD", "curl", "-f", "http://localhost:4040/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
```

**Service Configuration Explained:**

- **build:** Builds the image from the Local-AI-Server directory using the multi-stage Dockerfile
- **restart:** Automatically restarts the container if it crashes or the system reboots
- **env_file:** Loads environment variables from the application's .env file for consistent configuration
- **environment:** Overrides specific variables for the container, including model path and thread count
- **ports:** Exposes port 4040 for API access from the host and other containers
- **volumes:** Mounts the model file read-only, allowing model updates without rebuilding the image
- **healthcheck:** Monitors container health and enables automatic recovery through Docker's restart policy

---

## API Endpoints

The llama.cpp server exposes the following OpenAI-compatible endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `http://localhost:4040/v1/chat/completions` | POST | Chat completions API - accepts messages and returns model responses |
| `http://localhost:4040/v1/models` | GET | Lists available models loaded by the server |
| `http://localhost:4040/health` | GET | Health check endpoint for monitoring and orchestration |

These endpoints follow the OpenAI API specification, allowing the `@ai-sdk/openai` package to communicate with the local server without modification.
