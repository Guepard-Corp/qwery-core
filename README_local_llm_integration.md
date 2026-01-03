# Local AI Integration Project Report

## 1. Project Overview
This project integrates a local Artificial Intelligence model into the Qwery web application. The goal was to make the app "smart" without relying on paid cloud services like OpenAI or Azure, keeping everything running privately on a personal computer.
## 4. Code Changes (How we made it work)

To make the app talk to our local server, we had to edit a couple of files:

### 1. Making the App Understand the Local Model (`openai-model.provider.ts`)
We modified `packages/agent-factory-sdk/src/services/models/openai-model.provider.ts` to act as a "translator".
*   **Finding the Server**: We told the code to look for `localhost` (our computer) instead of the internet.
*   **Fixing Messages**: The local model gets confused by some complex message formats. We simplified things by combining messages and formatting tool outputs so the model can read them easily.
*   **Handling Tools**: We taught the app to spot when the model wants to use a tool (like searching a database) by looking for special text tags (`<<<TOOL_CALL>>>`) in the response.
### 2. Adding the Option to the Menu (`index.ts`)
*   We edited `packages/agent-factory-sdk/src/index.ts` to add **Mistral 7B (Local)** to the list of available models. Now, we can physically select it in the app's dropdown menu!
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

