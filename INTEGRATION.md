# Local LLM Integration: Technical Report (Final)

This document details the successful integration of a local open-source LLM into Qwery Core, replacing the dependency on cloud-based Azure OpenAI providers.

## ● Local LLM Used

The integration was validated using **llama.cpp** with the following model:
- **Model:** `tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf`
- **Format:** GGUF (Quantized 4-bit)
- **Base Architecture:** Llama-based architecture optimized for edge devices.
- **Reasoning:** Chosen for its low resource footprint, allowing for rapid testing on local hardware while maintaining sufficient reasoning capabilities for intent detection and basic data operations.

## ● Instructions to Run the Solution

To run Qwery Core with the local LLM integration, follow these steps:

### 1. Start the Local LLM Server
Ensure you have `llama.cpp` installed. Run the following command (adjust paths as necessary):

```powershell
# Navigate to your llama.cpp binary folder
cd D:\llama_cpp_cpu\llama-b7548-bin-win-cpu-x64

# Run the server with the model
# It is CRITICAL to increase the context size (-c) to at least 8192
llama-server.exe -m "D:\models\tinyllama-1.1b-chat-q4.gguf\tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf" -c 8192 --port 1234
```

The server will be available at `http://localhost:1234/v1`.

### 2. Configure Qwery Core
Update your `.env` file in `apps/web/` as specified in the Environment Variables section below.

### 3. Build and Start
```bash
# Install dependencies
pnpm install

# Build extensions
pnpm extensions:build

# Start the web application
cd apps/web
pnpm dev
```

## ● Environment Variables Added

The following variables must be configured in your `.env` file to enable the local LLM provider:

```env
# Provider Selection
AGENT_PROVIDER=local-llm
VITE_AGENT_PROVIDER=local-llm

# Local Server Configuration
LOCAL_LLM_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf
LOCAL_LLM_API_KEY=not-needed

# Database Configuration (Required for local development)
VITE_DATABASE_PROVIDER=sqlite
WORKING_DIR=workspace
VITE_WORKING_DIR=workspace
```

## ● List of Modified Files

The integration involved adding new provider logic and refactoring hardcoded references to use a centralized resolution pattern:

### New Files
- `packages/agent-factory-sdk/src/services/get-default-model.ts`: Central utility for model resolution.
- `packages/agent-factory-sdk/src/agents/prompts/compact-read-data-agent.prompt.ts`: Reduced token versions of system prompts.
- `packages/agent-factory-sdk/src/services/models/local-llm-model.provider.ts`: Core integration logic with technical hacks for local server compatibility.
- `apps/web/lib/config/model-config.ts`: Shared configuration utility.

### Modified Files
- `packages/agent-factory-sdk/package.json`: Added `@ai-sdk/openai` dependency.
- `packages/agent-factory-sdk/src/services/model-resolver.ts`: Registered `local-llm` provider.
- `packages/agent-factory-sdk/src/services/index.ts`: Exported new modules.
- `packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts`: Added fallback logic for models without structured output support.
- `packages/agent-factory-sdk/src/agents/actors/read-data-agent.actor.ts`: Optimized token usage for local models.
- `packages/agent-factory-sdk/src/agents/state-machine.ts`: Adjusted timeouts and state transitions.
- `packages/agent-factory-sdk/src/agents/factory-agent.ts`: Increased global execution timeouts.
- `apps/web/app/routes/api/chat.ts`: Updated API routes to use dynamic model resolution.
- `apps/web/components/agents-provider.tsx`: Frontend defaulting to local provider.
- `apps/cli/README.md`: Updated documentation for CLI users.

## ● Confirmation That All Builds Pass

All critical components have been verified to build successfully:

- [x] **Web App Build:** `cd apps/web && pnpm build` completes without errors.
- [x] **Extensions Build:** `pnpm extensions:build` completes and writes the registry successfully.
- [x] **Type Safety:** All new files are fully typed and pass TypeScript verification.

## ● Any Assumptions Made

During the integration, the following technical assumptions and decisions were made:

1.  **AI SDK Compatibility:** Local LLM servers and the Vercel AI SDK 5 have versioning mismatches (e.g., metadata requirements). A **"Specification Version Downgrade" (v3 to v2)** override was applied to force compatibility.
2.  **Context Window Constraints:** Local models often default to small context windows (2048 tokens). We assumed a minimum of 8192 is required and implemented **Compact Prompts** (reducing ~8,000 token prompts to ~200 tokens) to prevent 400 errors.
3.  **Structured Output Support:** Smaller models often fail at `generateObject`. We implemented a **YES/NO Reasoning Fallback** with regex-based parsing for intent detection.
4.  **Hardware Latency:** Local hardware is slower than cloud APIs. We increased system timeouts (Intent: 60s, Agent Response: 180s) to accommodate local execution speed.
5.  **Endpoint Consistency:** The provider explicitly forces the `/v1/chat/completions` endpoint to avoid the SDK attempting to use `/v1/responses`, which is unsupported by most local servers.
