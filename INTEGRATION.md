# Local LLM Integration – Qwery Core

## Overview

This integration adds support for running **Qwery** with a **local Large Language Model (LLM)** instead of a cloud-based OpenAI API.

The goal is to allow Qwery to communicate with any **OpenAI-compatible local inference server** (e.g. llama.cpp, vLLM, LM Studio, text-generation-webui) while keeping the existing OpenAI provider fully intact.

---

## Local LLM Used

- **Model**: Qwen2.5-1.5B-Instruct (GGUF – q4_k_m)
- **Runtime**: llama.cpp (OpenAI-compatible HTTP server)
- **Protocol**: OpenAI-compatible REST API
- **Endpoint**: `http://localhost:8080/v1`

The local model is accessed through a custom provider (`local-llama-model.provider.ts`) that internally uses the OpenAI SDK adapter with a custom base URL.

---

## How It Works

- A new **Local LLM provider** was introduced.
- The provider reuses the OpenAI SDK interface but redirects requests to a local server.
- Model resolution is handled dynamically via model strings such as:

```text
local/Qwen/Qwen2.5-1.5B-Instruct-GGUF:q4_k_m
