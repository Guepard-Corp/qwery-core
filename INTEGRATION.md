# LlamaCPP Integration for Qwery Core

## Overview
This integration replaces Azure OpenAI with a local llama.cpp server running Llama 2 7B Chat model, enabling fully offline LLM capabilities in Qwery Core.

## Local LLM Used
- **Engine**: llama.cpp server
- **Model**: Llama-2-7B-Chat-GGUF (Q4_K_M quantization)
- **Source**: [TheBloke/Llama-2-7B-Chat-GGUF](https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF)
- **Context Size**: 4096 tokens
- **Quantization**: Q4_K_M (balanced quality/performance)

## Prerequisites
1. **llama.cpp** built on your machine (with server support)
2. **Llama-2-7B-Chat model** downloaded (Q4_K_M quantization)
3. **Minimum 8GB RAM** recommended
4. **Windows PowerShell** (or equivalent terminal)

## Installation & Setup

### Step 1: Build llama.cpp
```powershell
# Clone llama.cpp repository
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp

# Build with CMake (Windows)
mkdir build
cd build
cmake ..
cmake --build . --config Release
```

### Step 2: Download Model
Download the model from HuggingFace:
- URL: https://huggingface.co/TheBloke/Llama-2-7B-Chat-GGUF
- File: `llama-2-7b-chat.Q4_K_M.gguf`
- Place in: `llama.cpp/models/`

### Step 3: Start llama.cpp Server
```powershell
# Navigate to llama.cpp build directory
cd llama.cpp\build\bin\Release

# Start the server
.\llama-server.exe -m ..\..\..\models\llama-2-7b-chat.Q4_K_M.gguf --host 0.0.0.0 --port 8080
```

The server should start and display:
```
llama server listening at http://0.0.0.0:8080
```

### Step 4: Configure Qwery Environment
Create/modify `.env` files in the project:

**apps/web/.env**:
```bash
# LlamaCPP Configuration
LLAMACPP_BASE_URL=http://localhost:8080
LLAMACPP_MODEL=llama-2-7b-chat

# Remove Azure variables (if present)
# AZURE_API_KEY=
# AZURE_RESOURCE_NAME=
# AZURE_OPENAI_DEPLOYMENT=
```

**apps/cli/.env**:
```bash
# LlamaCPP Configuration
LLAMACPP_BASE_URL=http://localhost:8080
LLAMACPP_MODEL=llama-2-7b-chat
```

### Step 5: Install Dependencies & Build
```powershell
# Install dependencies
pnpm install

# Build the web app
cd apps/web
pnpm build

# Build extensions (from root)
cd ..\..
pnpm extensions:build
```

### Step 6: Run Qwery
```powershell
# Start Qwery (from root)
pnpm dev
```

Open http://localhost:5173 in your browser.

## Modified Files

### Created Files
- **`packages/agent-factory-sdk/src/services/models/llamacpp-model.provider.ts`**
  - New provider implementation for llama.cpp
  - Implements `LanguageModel` interface
  - Handles HTTP communication with llama.cpp server
  - Supports both streaming and non-streaming modes

### Deleted Files
- **`packages/agent-factory-sdk/src/services/models/azure-model.provider.ts`**
  - Removed Azure OpenAI dependency

### Modified Files
1. **`packages/agent-factory-sdk/src/services/model-resolver.ts`**
   - Added `llamacpp` case in provider switch
   - Loads `llamacpp-model.provider.ts` dynamically

2. **`packages/agent-factory-sdk/src/agents/actors/detect-intent.actor.ts`**
   - Updated to use llama.cpp for intent detection
   - Simplified prompt for better performance with smaller models

3. **`packages/agent-factory-sdk/src/services/generate-conversation-title.service.ts`**
   - Updated model resolution to use `llamacpp/llama-2-7b-chat`

4. **`packages/agent-factory-sdk/src/services/generate-sheet-name.service.ts`**
   - Updated model resolution to use `llamacpp/llama-2-7b-chat`

5. **`.env.example` files** (apps/web, apps/cli)
   - Added LLAMACPP_BASE_URL and LLAMACPP_MODEL variables
   - Removed Azure-specific variables

6. **`apps/web/app/routes/api/chat.ts`**
   - Updated to support llamacpp provider

7. **`apps/web/app/routes/api/notebook/prompt.ts`**
   - Updated to support llamacpp provider

8. **Various generated files** (.react-router types, pnpm-lock.yaml)
   - Auto-generated during build process

## How It Works

### Architecture Overview
```
User Input
    ↓
Model Resolver (model-resolver.ts)
    ↓
LlamaCPP Provider (llamacpp-model.provider.ts)
    ↓
HTTP Request to llama.cpp server (localhost:8080)
    ↓
Llama 2 7B Model Processing
    ↓
Response back to Qwery
```

### Provider Implementation
The `llamacpp-model.provider.ts` follows Qwery's abstraction layer:

1. **Model Resolution** (`model-resolver.ts`)
   - Parses model string: `llamacpp/model-name`
   - Creates LlamaCPP provider instance

2. **LlamaCPP Provider** (`llamacpp-model.provider.ts`)
   - Implements `doGenerate()` for text generation
   - Implements `doStream()` for streaming responses
   - Communicates with llama.cpp via HTTP `/completion` endpoint
   - Handles temperature, max tokens, and stop sequences

3. **Usage Points**
   - **Intent Detection**: Classifies user messages (greeting, data query, etc.)
   - **Conversation Titles**: Generates descriptive titles for chats
   - **Sheet Naming**: Suggests meaningful names for imported data

## Testing

### 1. Test llama.cpp Server
```powershell
# Test server health
curl http://localhost:8080/health

# Test completion endpoint
curl http://localhost:8080/completion -X POST -H "Content-Type: application/json" -d '{\"prompt\":\"Hello\",\"n_predict\":10}'
```

### 2. Test Qwery Integration
```powershell
# Start llama.cpp server (Terminal 1)
cd llama.cpp\build\bin\Release
.\llama-server.exe -m ..\..\..\models\llama-2-7b-chat.Q4_K_M.gguf --host 0.0.0.0 --port 8080

# Start Qwery (Terminal 2)
cd qwery-core
pnpm dev
```

Open browser to http://localhost:5173:
1. Create a new conversation
2. Send message: "Hello"
3. Should trigger intent detection using local LLM
4. Conversation should receive an auto-generated title

### 3. Verify No Cloud Calls
- Open browser DevTools → Network tab
- Send messages in Qwery
- Confirm NO requests to Azure/OpenAI endpoints
- Only requests to `localhost:8080` should appear

## Build Verification

Both required builds complete successfully:

```powershell
✅ cd apps/web && pnpm build
   Output: Build completed without errors

✅ pnpm extensions:build (from root)
   Output: Extensions built successfully
```

## Environment Variables Added

| Variable | Description | Example |
|----------|-------------|---------|
| `LLAMACPP_BASE_URL` | URL of llama.cpp server | `http://localhost:8080` |
| `LLAMACPP_MODEL` | Model name identifier | `llama-2-7b-chat` |




### Issue: JSON Parsing Errors
```
Error: Could not parse JSON from response
```
**Solution**: 
- llama.cpp may return incomplete JSON
- Check prompt formatting in code
- Increase `n_predict` parameter if output is truncated

### Issue: Model Not Found
```
Error: failed to load model
```
**Solution**: 
- Verify model path is correct
- Ensure model file is not corrupted
- Re-download from HuggingFace if needed



## Known Limitations
- Single concurrent request (llama.cpp server limitation)
- Slower than cloud APIs (acceptable for local dev)
- Limited to models that fit in available RAM
- No built-in authentication for llama.cpp server

---

**Integration Date**: January 2025  
**Author**: [OUMAYMA JELLALI]  
**Model**: llama.cpp + Llama-2-7B-Chat-GGUF (Q4_K_M)  
**Status**: ✅ Builds Pass | ✅ Integration Complete | ✅ No Cloud Dependencies