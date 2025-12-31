# Guepard Internship - Local LLM Integration

## Overview
- Replaced cloud Azure OpenAI with local open-source LLM (llama.cpp + Phi-3-mini-4k-instruct)
- Wired into Qwery's model provider system using direct fetch in model-resolver.ts
- App builds and runs successfully
- Real local system, not mocks
- Constraints met: OTHER THAN OLLAMA (used llama.cpp)

## Changes Made
- Modified: packages/agent-factory-sdk/src/services/model-resolver.ts (added 'local' provider case with fetch to localhost:8080/v1)
- Added: .env.local with USE_LOCAL_LLM=true and VITE_* variables for clean run

## How to Run Locally
1. Start local LLM: llama-server.exe -m Phi-3-mini-4k-instruct-q4.gguf --host 0.0.0.0 --port 8080 -c 4096
2. In .env.local: USE_LOCAL_LLM=true + VITE_PRODUCT_NAME=Qwery, VITE_SITE_TITLE=Qwery Local Dev, VITE_SITE_DESCRIPTION=Qwery data automation platform - local development, VITE_SITE_URL=http://localhost:3000
3. pnpm extensions:build
4. cd apps/web && pnpm dev
5. Open http://localhost:3000
6. Use AI features (conversation, playground) — requests go to local LLM

## Verification
- Build: pnm extensions:build succeeds
- Run: pnm dev runs (extension warnings normal)
- AI: Prompts use local Phi-3, network tab shows localhost:8080 calls
- Tested with "Hello" prompt — got response from local model

## Assumptions
- Local LLM server running during test
- App pages (projects, conversation) load correctly

Full objective met: read codebase, understand abstraction, integrate real local LLM.