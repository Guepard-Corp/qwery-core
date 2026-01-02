# Local LLM Guide (llama.cpp)

This project supports running models locally via **llama.cpp** to replace cloud dependencies.

## 🚀 How to Start
1.  **Download llama.cpp Server**: Get the [latest binaries](https://github.com/ggerganov/llama.cpp/releases). Look for the `llama-server` (or `server`) executable.
2.  **Download Model**: Get a GGUF format model. We recommend [Llama-3-8B-Instruct](https://huggingface.co/lmstudio-community/Meta-Llama-3-8B-Instruct-GGUF).
3.  **Run the Server**:
    ```bash
    ./llama-server.exe -m "path/to/model.gguf" -c 4096 --port 8080
    ```
    - `-m`: Specifies the path to your model file.
    - `-c 4096`: Sets the context window (4096 is standard for chat).
    - `--port 8080`: The port the internal API will listen on.

## 🧠 Which Model?
The system is optimized for **Meta-Llama-3-8B-Instruct**.
- **Why?**: It offers a high level of reasoning capability while remaining small enough to run on most consumer hardware.
- **Quantization**: We recommend **Q4_K_M** quantization. It reduces the memory footprint (~5GB) with minimal loss in intelligence.
- **Compatibility**: Any model in GGUF format that supports the OpenAI chat completion spec will work.

## 🛠️ How the Provider Works
The project uses a custom `LlamaCppProvider` to bridge the Vercel AI SDK and your local server.

- **Adapter**: It uses `@ai-sdk/openai` but reconfigures the `baseURL` to your local machine.
- **Internal Mapping**: When the agent requests a response, the provider translates standard messages into the format `llama-server` expects.
- **Lazy Error Handling**: In the AI SDK, connections are "lazy" (they only connect when text starts generating). We use a special **wrapper** around the model's `doStream` and `doGenerate` methods. This wrapper catches network failures immediately and translates them into user-friendly instructions (e.g., "Is llama-server running?").
