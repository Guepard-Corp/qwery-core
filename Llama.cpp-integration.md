# Llama.cpp Integration for Qwery Core

# Overview

This integration replaces the cloud-based Azure OpenAI dependency with a local llama.cpp server running TinyLlama-1.1B-Chat-v1.0. The integration demonstrates successful implementation of a custom model provider within Qwery's existing architecture.

# Local LLM Used
Model Details:

Provider: llama.cpp
Model: TinyLlama-1.1B-Chat-v1.0 (Q5_K quantized)
Model Size: 745.11 MiB
Context Window: 2048 tokens
Architecture: Llama-based, 1.1B parameters
Quantization: Q5_K (Medium quality, efficient size)

# Why TinyLlama?

Lightweight and fast inference on CPU
Suitable for testing and demonstration
Easy to run locally without GPU requirements
Open-source and freely available

Download Model
The TinyLlama GGUF model can be downloaded from:

Hugging Face - TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF

# Prerequisites

Windows 10/11 (or adapt paths for Linux/Mac)
Node.js and pnpm installed
llama.cpp binaries downloaded
TinyLlama GGUF model file downloaded

# Start the llama.cpp on http server : 

llama-server ^
  -m C:\Users\bensa\Documents\tinyllama.gguf ^
  --port 8080 ^
  --ctx-size 2048 ^
  --cache-ram 0

# build the app : 

pnpm clean 
pnpm install
cd packages\extensions\mysql
pnpm build

cd ..\postgresql

pnpm build


# 4. Go back to root and build extensions bundles
cd ..\..\..
pnpm extensions:build

# 5. Build the web app
cd apps\web
pnpm build
pnpm dev

# Configure environment variables
 add a .env using the .env_example given 

# general pipeline 

#User Request
    ↓
chat.ts (API Route)
    ↓
resolveModel('llama_cpp/tinyllama')
    ↓
model-resolver.ts
    ↓
llama-cpp.provider.ts
    ↓
HTTP Request to llama-server
    ↓
Local LLM Processing
    ↓
Response back through chain

# Known Limitations

Context Window Constraint
TinyLlama has a 2048 token context window. Qwery's system prompts can exceed this limit, resulting in:
LLM ERROR: Context size has been exceeded
This is a model limitation, not an integration issue. The provider correctly:

Sends requests to llama-server
Receives responses
Handles errors gracefully

Possible Solutions for Production

Implement more aggressive prompt truncation ( i already implemented a truncation , it works for the first prompts)
Use a cloud deployment of llama.cpp with more resources
Switch to a different local LLM with larger context window

Assumptions Made

Windows Environment: Paths and commands assume Windows OS
CPU-Only Execution: llama.cpp configured for CPU inference (no GPU required)
Default Port: llama-server uses port 8080 (can be changed in .env)
Local Development: Configuration optimized for local testing, not production
Single User: No concurrent request handling optimizations
