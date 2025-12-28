# Llama.cpp + Mistral 7B - Ready to Run!

This is a completely self-contained Docker setup. Everything is included - no downloads needed!

## For Reviewers: Just 2 Commands!

### 1. Build the container (this downloads everything during build):
```bash
docker-compose build
```

**Note:** The build will take 5-10 minutes as it compiles llama.cpp and downloads the Mistral 7B model (~2.5GB).

### 2. Start the server:
```bash
docker-compose up
```

That's it! The server will be running at **http://localhost:8080**

## Test It Immediately

### Quick Browser Test
Open: **http://localhost:8080** (you should see the llama.cpp web interface)

### Test with curl
```bash
curl http://localhost:8080/health
```

### Test with Postman

**Import the collection:**
1. Open Postman
2. Click "Import"
3. Select `postman-collection.json` from this folder
4. Run any request!

**Or create a quick test request:**

```
POST http://localhost:8080/completion
Content-Type: application/json

{
  "prompt": "What is artificial intelligence?",
  "n_predict": 100,
  "temperature": 0.7
}
```

## What's Inside?

- ✅ **llama.cpp server** - Built from source
- ✅ **Mistral 7B Instruct model** - Downloaded during build (Q2_K quantization)
- ✅ **All dependencies** - Everything included
- ✅ **Port 8080** - Ready for API calls

## Common Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/health` | GET | Check server health |
| `/completion` | POST | Text completion |
| `/v1/chat/completions` | POST | OpenAI-compatible chat |
| `/props` | GET | Model information |
| `/tokenize` | POST | Tokenize text |

## Example Requests

### Simple Completion
```bash
curl -X POST http://localhost:8080/completion \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "The capital of France is",
    "n_predict": 50
  }'
```

### Chat Completion (OpenAI format)
```bash
curl -X POST http://localhost:8080/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is machine learning?"}
    ],
    "max_tokens": 100
  }'
```

## Stop the Server

```bash
docker-compose down
```

## Troubleshooting

**Build fails:**
- Ensure you have a stable internet connection (model download is ~2.5GB)
- Try again: `docker-compose build --no-cache`

**Port 8080 already in use:**
- Edit `docker-compose.yml` and change `"8080:8080"` to `"8081:8080"`
- Access server at http://localhost:8081

**Server is slow:**
- This is normal for CPU-only inference
- First request may take 10-20 seconds as model loads
- Subsequent requests are faster

## Performance Notes

- **Model:** Mistral 7B Instruct (Q2_K quantization)
- **Context Size:** 2048 tokens
- **Processing:** CPU-only
- **First response:** ~10-20 seconds (model loading)
- **Follow-up responses:** ~3-5 seconds (depending on CPU)

## Architecture

```
Docker Container
├── llama.cpp (compiled from source)
├── Mistral 7B Q2_K model (embedded)
└── HTTP Server (port 8080)
```

Everything runs in a single container with no external dependencies!
