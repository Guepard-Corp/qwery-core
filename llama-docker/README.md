# Llama.cpp Docker Server with Mistral 7B

This Docker setup runs llama.cpp server with the Mistral 7B Instruct model for inference via API (Postman compatible). Everything (code + model) is baked into the image at build time.

## Prerequisites

- Docker
- Docker Compose
- At least 4GB free disk space

## Setup Instructions

### 1. Download the Model

First, create the models directory and download the Mistral 7B Instruct model:

```bash
# Create models directory
mkdir models

# Download the model (Q2_K quantized version - ~2.5GB)
curl -L -o models/mistral-7b-instruct-v0.2.Q2_K.gguf \
  https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q2_K.gguf
```

**Alternative download methods:**

**Using wget:**
```bash
wget -O models/mistral-7b-instruct-v0.2.Q2_K.gguf \
  https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q2_K.gguf
```

**Or download manually:**
- Visit: https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF
- Download `mistral-7b-instruct-v0.2.Q2_K.gguf`
- Place it in the `models/` folder

### 2. Build and Run the Docker Container

```bash
# Build the Docker image
docker-compose build

# Start the server
docker-compose up -d
```

### 3. Verify the Server is Running

```bash
# Check container logs
docker-compose logs -f

# Or check if the server is responding
curl http://localhost:8080/health
```

## Using with Postman

### Health Check

**Request:**
```
GET http://localhost:8080/health
```

### Generate Text (Completion)

**Request:**
```
POST http://localhost:8080/completion
Content-Type: application/json

{
  "prompt": "What is the capital of France?",
  "n_predict": 128,
  "temperature": 0.7,
  "top_k": 40,
  - ~3GB free disk space for the model inside the image
}
```

  ## Build and Run (model auto-downloaded during build)

  ```bash
  # Build the Docker image (downloads model + builds llama.cpp via CMake)
```
POST http://localhost:8080/v1/chat/completions
  ```
  # Start the server

  ```
Import this JSON into Postman:

```json
{
  "info": {
    "name": "Llama.cpp Server",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "header": [],
        "url": {
          "raw": "http://localhost:8080/health",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8080",
          "path": ["health"]
        }
      }
    },
    {
      "name": "Text Completion",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"prompt\": \"What is the capital of France?\",\n  \"n_predict\": 128,\n  \"temperature\": 0.7\n}"
        },
        "url": {
          "raw": "http://localhost:8080/completion",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8080",
          "path": ["completion"]
        }
      }
    },
    {
      "name": "Chat Completion",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"messages\": [\n    {\n      \"role\": \"user\",\n      \"content\": \"What is the capital of France?\"\n    }\n  ],\n  \"temperature\": 0.7,\n  \"max_tokens\": 128\n}"
        },
        "url": {
          "raw": "http://localhost:8080/v1/chat/completions",
          "protocol": "http",
          "host": ["localhost"],
          "port": "8080",
          "path": ["v1", "chat", "completions"]
        }
      }
    }
  ]
}
```

## Docker Commands

```bash
# Start the server
docker-compose up -d

# Stop the server
docker-compose down

# View logs
docker-compose logs -f

# Restart the server
docker-compose restart

# Rebuild after changes
docker-compose up -d --build
```

## Parameters Explanation

- `n_predict` / `max_tokens`: Maximum number of tokens to generate
- `temperature`: Randomness (0.0 = deterministic, 1.0 = very random)
- `top_k`: Limits vocabulary to top K tokens
- `top_p`: Nucleus sampling threshold
- `stream`: Enable streaming responses
- `-c 2048`: Context size (tokens)

## Troubleshooting

**Server not starting:**
- Check if the model file exists in `./models/` directory
- Verify the model filename matches exactly
- Check Docker logs: `docker-compose logs`

**Out of memory:**
- The Q2_K model is the smallest quantization
- Reduce context size with `-c 1024` or `-c 512`
- Close other applications

**Slow inference:**
- This is CPU-only inference (no GPU)
- Q2_K is the fastest quantization but lower quality
- For faster inference, consider GPU-enabled setup

## Model Quantization Options

If you want better quality, download a different quantization:

- **Q2_K**: Smallest, fastest, lowest quality (~2.5GB)
- **Q4_K_M**: Balanced quality and size (~4.1GB)
- **Q5_K_M**: Higher quality (~4.8GB)
- **Q8_0**: Very high quality (~7.2GB)

Replace the filename in `docker-compose.yml` and download accordingly.

## License

This setup uses:
- llama.cpp (MIT License)
- Mistral 7B (Apache 2.0 License)
