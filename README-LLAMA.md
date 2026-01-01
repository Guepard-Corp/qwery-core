# LlamaCPP Integration for Qwery Core

This document explains how to set up and use the local LlamaCPP LLM integration in Qwery Core.

## Overview

Qwery Core now supports local, open-source LLMs through LlamaCPP server integration. This replaces cloud-based LLM dependencies with a local Mistral 7B model running on your machine.

## Prerequisites

- [LlamaCPP Server](https://github.com/ggerganov/llama.cpp/tree/master/examples/server) installed and running
- Mistral 7B Instruct model downloaded (GGUF format)

## Setup Instructions

### 1. Start LlamaCPP Server

Download the Mistral 7B Instruct model (GGUF format) and start the server:

```bash
# Example command (adjust paths as needed)
./llama-server -m models/mistral-7b-instruct-v0.1.Q4_K_M.gguf --host 0.0.0.0 --port 8080 -c 2048
```

The server should be accessible at `http://localhost:8080`.

### 2. Environment Configuration

Set the following environment variables in your `.env` file:

```env
LLAMACPP_BASE_URL=http://localhost:8080/v1
LLAMACPP_MODEL=mistral-7b-instruct
DEFAULT_MODEL=llamacpp/mistral-7b-instruct
```

### 3. Model Selection

In the Qwery UI, select `llamacpp/mistral-7b-instruct` as your model. The system will automatically use the local LlamaCPP server.

## How It Works

### Provider Architecture

The LlamaCPP provider wraps the OpenAI-compatible API provided by llama.cpp server:

1. **Model Resolution**: The `model-resolver.ts` detects `llamacpp/` prefixed models and routes them to the LlamaCPP provider
2. **API Compatibility**: Uses OpenAI SDK format to communicate with the local server
3. **Error Handling**: Graceful fallbacks if the local server is unavailable

### Key Components

- `llamacpp-model.provider.ts`: Creates OpenAI-compatible provider pointing to local server
- `model-resolver.ts`: Routes model requests to appropriate providers
- Environment variables control server URL and default model

### Supported Features

- Text generation and chat completion
- Tool calling (function calling)
- Streaming responses
- Multi-turn conversations

## Troubleshooting

- **Server not responding**: Ensure llama.cpp server is running on port 8080
- **Model not found**: Verify `LLAMACPP_MODEL` matches the loaded model name
- **Connection errors**: Check `LLAMACPP_BASE_URL` is correct


- Local inference may be slower than cloud APIs
- Memory usage depends on model size (Mistral 7B requires ~4GB VRAM for Q4 quantization)
- First request may be slower due to model loading</content>
<parameter name="filePath">d:\code\qwery-core\README-LLAMA.md