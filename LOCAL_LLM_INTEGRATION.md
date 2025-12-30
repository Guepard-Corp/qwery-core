# Local AI Integration Project Report

## 1. Project Overview
This project integrates a local Artificial Intelligence model into the Qwery web application. The goal was to make the app "smart" without relying on paid cloud services like OpenAI or Azure, keeping everything running privately on a personal computer.

## 2. Technology Choices

### Why Mistral 7B?
We chose the **Mistral 7B** model because it is widely considered the best "small" Language Model available today.
*   **Efficient:** It creates high-quality responses similar to larger models (like GPT-3.5) but is small enough to run on a standard laptop.
*   **Open Source:** It is free to use and modify.

### Why llama.cpp?
We used **llama.cpp** (specifically `llama-server`) to run the model.
*   **Speed:** It is highly optimized to run LLMs on normal consumer hardware (CPU and standard RAM), without needing expensive NVIDIA GPUs.
*   **Compatibility:** It provides a standard "API" that looks exactly like OpenAI's. This meant we could plug it into our existing code easily without rewriting everything.

## 3. Setup Process

### Step 1: Downloading the Model
We downloaded the quantized version of the model to save memory:
*   **Model:** `Mistral-7B-Instruct-v0.2-GGUF`
*   **Type:** `Q4_K_M` (4-bit quantization)
*   **Source:** Downloaded from HuggingFace (TheBloke's repo).

### Step 2: Running the Server
We started the local AI server using the command:
```bash
./llama-server -m "path/to/your/mistral-7b-instruct-v0.2.Q4_K_M.gguf" --port 8080 -c 16384
```
*   **`-m`**: The path to your model file. If the file is not in the same folder as `llama-server`, you must provide the full path (e.g., `C:\Users\Name\Downloads\mistral.gguf`).
*   **`-c 16384`**: This increases the "memory" (context size) of the model to 16k tokens. This is required because sending the database schema takes up a lot of space.

## 4. Code Integration Changes
To connect the application to our new local server, we made the following changes:

### 1. `packages/agent-factory-sdk/src/services/models/openai-model.provider.ts`
This file contains the core logic for adapting `llama-server` to the OpenAI SDK interface. Key changes include:
*   **Local Endpoint Detection**: Checks if `baseUrl` contains `127.0.0.1` or `localhost`.
*   **Message Normalization**:
    *   Converts `tool` role messages to `user` role (prefixed with `[Tool Output]`) to satisfy strict template requirements of some local models.
    *   Merges adjacent messages of the same role.
    *   Handles `system` prompts by prepending them to the first user message.
*   **Client-Side Tool Parsing**:
    *   Forces `stream: false` to allow the client to intercept the full response.
    *   Parses a custom tool call pattern (`<<<TOOL_CALL>>>...<<<END_TOOL_CALL>>>`) from the raw text.
    *   Constructs a valid OpenAI `tool_calls` object from the parsed JSON.
*   **Stream Simulation**:
    *   Re-implements a streaming response using `ReadableStream` to satisfy the AI SDK's expectation of a stream, even though the actual request was non-streaming.

### 2. `packages/agent-factory-sdk/src/index.ts`
*   Added **Mistral 7B (Local)** to the list of `baseModels` with the identifier `openai/TheBloke/Mistral-7B-Instruct-v0.2-GGUF:Q4_K_M`.
