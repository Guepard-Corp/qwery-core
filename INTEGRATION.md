# Integration & PR Summary

This project implements a fully local, robust chatbot integration using **llama.cpp** and removes legacy hardcoded dependencies on Azure OpenAI.

## 🌟 Key Achievements
- **Azure Decoupling**: Removed all hardcoded Azure model dependencies, making the entire system (CLI, Web, and SDK) provider-agnostic.
- **Local LLM Integration**: Full support for `llama.cpp` using a custom provider and robust connection error handling.
- **System Stability**: Resolved hanging issues by ensuring the state machine always resets and reducing timeouts for faster feedback.

## 🚀 Instructions to Run
1.  **Start Local Server**: Run `llama-server.exe -m "model.gguf" -c 4096 --port 8080`.
2.  **Environment Setup**: Ensure `LOCAL_LLAMA_BASE_URL=http://localhost:8080/v1` in `.env`.
3.  **Start**: Run `pnpm dev` or the CLI tools.

## 🗂️ Detailed Change Logs



### [apps/web]
- **`.env.example`**: Added placeholders for local LLM configuration (`LOCAL_LLAMA_...`).
- **`app/routes/api/chat.ts`**: Implemented standard SSE `[DONE]` signal and removed Azure-specific headers.
- **`app/routes/api/notebook/prompt.ts`**: Standardized the notebook prompt API to handle any supported provider.
- **`components/agents-provider.tsx`**: Updated the UI context to propagate dynamic model selection.
- **`lib/utils/error-handler.ts`**: Enhanced error detection to identify and report local connection issues clearly.
- **`package.json`**: Aligned web dependencies with the unified provider architecture.
- **`public/extensions/.../driver.js`**: Minor updates to handle generalized response stream formats from varied models.

### [packages/agent-factory-sdk]
- **`package.json`**: Build script updates and unified dependency management for adapters.
- **`src/agents/actors/detect-intent.actor.ts`**: Decoupled from Azure; Reduced internal timeout to 60s; Implemented **message sanitization** to standardise input across models.
- **`src/agents/actors/read-data-agent.actor.ts`**: Removed hardcoded Azure logic; Now **propagates the current model** as a parameter to all internal tools (`getSchema`, `generateChart`, `generateSQL`) to ensure execution consistency.
- **`src/agents/actors/summarize-intent.actor.ts`**: Decoupled from Azure; Updated to use dynamic model resolution for cross-provider summarization.
- **`src/agents/actors/system-info.actor.ts`**: Removed hardcoded `azure/gpt-5-mini` dependency; the actor now accepts and propagates a dynamic `model` parameter to the `resolveModel` service. using the shared `message-utils`.
- **`src/agents/factory-agent.ts`**: 
    - **Initialization**: Added comprehensive logging for the agent lifecycle (Registry, QueryEngine, State Machine creation).
    - **Robustness**: Wrapped QueryEngine creation in a try-catch for better error reporting; implemented a more reliable "Idle" state check during initialization.
    - **Stability**: Fixed state machine reset to `idle` on all stream completions; implemented 30s response timeout.
- **`src/agents/state-machine.ts`**: Reduced actor invocation timeouts (Intent/ReadData) from 120s to 60s for better UX.
- **`src/agents/tools/generate-chart.ts`**: Updated chart generation prompts to be more compatible with open-source models (Llama-3).
- **`src/index.ts`**: Exported new provider interfaces.
- **`src/services/browser-transport.ts`**: Improved SSE parsing to handle standard `[DONE]` signals.
- **`src/services/generate-conversation-title.service.ts`**: Generalized title generation for all LLMs.
- **`src/services/generate-sheet-name.service.ts`**: Decoupled sheet naming logic from Azure.
- **`src/services/model-resolver.ts`**: **CORE**: Implemented the multi-provider routing (Azure, Ollama, Local Llama, TransformerJS).

### [New / Untracked Files]
- **`packages/agent-factory-sdk/src/agents/utils/message-utils.ts`**: New utility providing `sanitizeMessages`. This ensures compliance with AI SDK requirements by:
    1.  **Filtering**: Removing messages with empty `parts` arrays that cause API errors.
    2.  **Compliance**: Forcing at least one `text` part in assistant messages (adding an empty string if necessary) to prevent multi-modal validation failures.
- **`packages/agent-factory-sdk/src/services/models/llama.cpp-model.provider.ts`**: The new adapter for local LLMs with robust error handling.
- **`packages/agent-factory-sdk/src/services/models/local-model.provider.ts`**: Generic local provider interface.
- **`README_LOCAL_LLM.md`**: New comprehensive guide for users.
- **`INTEGRATION.md`**: This PR summary.

## 📝 Integration Summary
The project has been successfully migrated from a hardcoded **Azure OpenAI** setup to a dynamic, **provider-agnostic architecture**. 

Key technical highlights include:
- **Abstraction**: Introduced a `model-resolver` that handles multiple LLM backends (Azure, Ollama, local-llama, etc.).
- **New Provider**: Implemented the `LlamaCppProvider`, a custom adapter that connects the AI SDK to a local `llama-server`.
- **Decoupling**: Systematically removed Azure dependencies across all SDK actors, the CLI, and the Web front-end.
- **Resilience**: Implemented custom wrappers for local LLM connections to provide actionable error hints (e.g., checking if the server is running) and optimized system timeouts for faster failure recovery.
- **Standardization**: Added message sanitization logic to ensure strict AI SDK complgiance across different model behaviors.

This migration enables fully offline development and deployment while maintaining a high level of system robustness and flexibility.
