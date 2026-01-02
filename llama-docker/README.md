# Llama.cpp Docker Server with Mistral 7B

A self-contained Docker setup for running llama.cpp server with Mistral 7B Instruct model. Optimized for handling large context queries from Qwery.

## 🚀 Quick Start

### Prerequisites

- Docker
- Docker Compose
- At least 4GB free disk space

### Build and Run

```bash
# Build the Docker image (downloads model during build)
docker-compose build

# Start the server
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop the server
docker-compose down
```

The server will be available at **http://localhost:8080**

## 📦 What's Inside

- **llama.cpp server** - Built from source using CMake
- **Mistral 7B Instruct model** - Q2_K quantization (~2.5GB)
- **Ubuntu 22.04** base image
- **All dependencies** included (no external downloads needed after build)

## ⚙️ Server Configuration

The server is configured with optimized parameters for handling large context queries:

```bash
llama-server \
  -m /app/models/mistral-7b-instruct-v0.2.Q2_K.gguf \
  --host 0.0.0.0 \
  --port 8080 \
  -c 8192 \
  -b 512 \
  --threads 8 \
  --no-mmap
```

### Parameter Explanation

| Parameter | Value | Purpose |
|-----------|-------|---------|
| `-m` | model path | Specifies the GGUF model file to load |
| `--host` | `0.0.0.0` | Listen on all network interfaces (allows external connections) |
| `--port` | `8080` | HTTP server port |
| `-c` | `8192` | **Context window size** - Extended to 8192 tokens for large query contexts (default is 512) |
| `-b` | `512` | Batch size for prompt processing |
| `--threads` | `8` | Number of CPU threads to use for inference |
| `--no-mmap` | - | Disable memory mapping (better for Docker containers) |

### Why `-c 8192`?

The context window (`-c 8192`) is set to **8192 tokens** (vs default 512) because:

- **Qwery sends large context queries** - Database schemas, table definitions, sample data, and SQL queries can be large
- **Better SQL generation** - More context allows the model to understand complex database relationships
- **Multi-table queries** - Handles joins across multiple tables with full schema information
- **Conversation history** - Maintains longer conversations with the user

> **Note:** Larger context uses more RAM (~1-2GB per 1K tokens). Adjust `-c` value based on your system's resources.

## 🧪 Testing the Server

### Health Check

```bash
curl http://localhost:8080/health
```

### Simple Completion

```bash
curl -X POST http://localhost:8080/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Explain SQL JOIN operations:",
    "n_predict": 200,
    "temperature": 0.7
  }'
```

### Chat Completion (OpenAI-compatible)

```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "system",
        "content": "You are a SQL expert assistant."
      },
      {
        "role": "user",
        "content": "Write a SQL query to get all users with orders in the last 30 days"
      }
    ],
    "max_tokens": 300,
    "temperature": 0.5
  }'
```

## 📚 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check server health |
| `/completion` | POST | Text completion |
| `/v1/chat/completions` | POST | OpenAI-compatible chat API |
| `/props` | GET | Model properties and info |
| `/tokenize` | POST | Tokenize input text |
| `/detokenize` | POST | Convert tokens back to text |

## 🔧 Customization

### Change Port

Edit `docker-compose.yml`:

```yaml
ports:
  - "8081:8080"  # Host port : Container port
```

### Adjust Context Size

Edit `Dockerfile` and change the `-c` parameter:

```dockerfile
CMD ["/app/llama.cpp/build/bin/llama-server", ... "-c", "4096", ...]
```

Then rebuild:

```bash
docker-compose build --no-cache
docker-compose up -d
```

### Use Different Model

**The architecture is model-agnostic** - simply replace the model in the Dockerfile to use more capable models.

**Current Model (Mistral 7B v0.2)** has limitations:
- ❌ No tool calling support (required for data queries)
- ❌ No system message support
- ✅ Basic chat only

**Recommended for full Qwery features:**
- Llama 3.1 8B Instruct or larger
- Qwen 2.5 7B Instruct or larger
- Mistral v0.3 7B Instruct or larger

**To change the model:**

1. Update the download URL in `Dockerfile`:
```dockerfile
# Example: Switching to Llama 3.1 8B Q4_K_M
RUN curl -L -o /app/models/llama-3.1-8b-instruct.Q4_K_M.gguf \
    https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf
```

2. Update the model path in `CMD`:
```dockerfile
CMD ["/app/llama.cpp/build/bin/llama-server", "-m", "/app/models/llama-3.1-8b-instruct.Q4_K_M.gguf", ...]
```

3. Rebuild:
```bash
docker-compose build --no-cache
docker-compose up -d
```

> Find GGUF models at [Hugging Face](https://huggingface.co/models?library=gguf). Use Q4_K_M or Q5_K_M quantization for best balance.

## 🐛 Troubleshooting

### Build Fails

```bash
# Clean rebuild
docker-compose down
docker-compose build --no-cache
```

### Port Already in Use

```bash
# Check what's using port 8080
netstat -ano | findstr :8080

# Or change port in docker-compose.yml
```

### Server is Slow

- **First request** takes 60-70 seconds (model loads into memory)
- **Subsequent requests** are faster (10-20 seconds for CPU inference)
- Consider using GPU-enabled build for faster inference

### Out of Memory

If the server crashes due to memory:

1. Reduce context size: `-c 4096` or `-c 2048`
2. Use smaller model quantization (Q2_K is already small)
3. Reduce batch size: `-b 256`

## 📊 Performance Notes

| Metric | Value | Notes |
|--------|-------|-------|
| **Model Size** | ~2.5GB | Q2_K quantization (smallest) |
| **RAM Usage** | 4-6GB | Depends on context size |
| **Build Time** | 5-10 min | Downloads model + compiles llama.cpp |
| **First Response** | 10-20s | Model loading time |
| **Inference Speed** | 3-5s | CPU-only, varies by query |
| **Context Limit** | 8192 tokens | Configurable via `-c` parameter |

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│  Docker Container (llama-cpp-server)    │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  llama.cpp Server (port 8080)   │   │
│  └─────────────────────────────────┘   │
│               ↓                         │
│  ┌─────────────────────────────────┐   │
│  │  Mistral 7B Q2_K Model          │   │
│  │  (embedded in container)         │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
           ↓ HTTP API
    http://localhost:8080
```

## 📝 Files Overview

- **`Dockerfile`** - Builds llama.cpp and downloads model
- **`docker-compose.yml`** - Orchestrates the container
- **`REVIEWER-GUIDE.md`** - Quick start guide for reviewers
- **`.gitignore`** - Excludes build artifacts and models

## 🔒 Security Notes

- Server binds to `0.0.0.0` (all interfaces) - Use firewall rules in production
- No authentication by default - Add reverse proxy (nginx) with auth if needed
- Model runs in isolated Docker container

## 📄 License

This setup uses:
- **llama.cpp** - MIT License
- **Mistral 7B** - Apache 2.0 License

---

**Built for Qwery** - SQL query assistant with AI-powered schema understanding
