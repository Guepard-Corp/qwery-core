# Running Llama.cpp Server on Windows (Native)

Since you've downloaded the pre-built Windows binaries and the Mistral model, you can run it directly without Docker.

## Setup

### 1. Organize Your Files

Create this structure:
```
llama-docker/
├── llama.cpp/           (extract the downloaded Windows release here)
│   └── llama-server.exe
└── models/
    └── mistral-7b-instruct-v0.2.Q2_K.gguf  (your downloaded model)
```

### 2. Extract llama.cpp

Extract the downloaded `llama-<version>-bin-win-cuda-cu12.2.0-x64.zip` or similar file into the `llama.cpp` folder. You should see `llama-server.exe` (or `server.exe`) inside.

### 3. Place the Model

Move your downloaded `mistral-7b-instruct-v0.2.Q2_K.gguf` file into the `models/` folder.

## Running the Server

### Option 1: Using the Start Script (Recommended)

Run the provided PowerShell script:
```powershell
.\start-server.ps1
```

### Option 2: Manual Command

Open PowerShell in this directory and run:
```powershell
.\llama.cpp\llama-server.exe -m .\models\mistral-7b-instruct-v0.2.Q2_K.gguf --host 0.0.0.0 --port 8080 -c 2048
```

**Parameters explained:**
- `-m`: Path to the model file
- `--host 0.0.0.0`: Listen on all network interfaces
- `--port 8080`: Server port
- `-c 2048`: Context window size (tokens)

## Test the Server

Once running, you should see output like:
```
llama server listening at http://0.0.0.0:8080
```

### Test with Browser
Open: http://localhost:8080

### Test with PowerShell
```powershell
Invoke-WebRequest -Uri http://localhost:8080/health
```

## Using with Postman

Import the `postman-collection.json` file into Postman, or create a new request:

**Simple Completion:**
```
POST http://localhost:8080/completion
Content-Type: application/json

{
  "prompt": "What is the capital of France?",
  "n_predict": 128,
  "temperature": 0.7
}
```

**Chat Completion (OpenAI compatible):**
```
POST http://localhost:8080/v1/chat/completions
Content-Type: application/json

{
  "messages": [
    {
      "role": "user",
      "content": "What is the capital of France?"
    }
  ],
  "max_tokens": 128
}
```

## Common Issues

**"llama-server.exe not found":**
- Make sure you extracted the llama.cpp release into the `llama.cpp` folder
- Check the exact filename (might be `server.exe` or `llama-server.exe`)

**"Model not found":**
- Verify the model file is in the `models/` folder
- Check the filename matches exactly in the command

**Port already in use:**
- Change the port: `--port 8081`
- Or stop the process using port 8080

**Slow inference:**
- This is normal for CPU inference
- Q2_K is the fastest quantization
- Close other applications to free up resources

## Advanced Options

### With More Context
```powershell
.\llama.cpp\llama-server.exe -m .\models\mistral-7b-instruct-v0.2.Q2_K.gguf --host 0.0.0.0 --port 8080 -c 4096
```

### With Specific Thread Count
```powershell
.\llama.cpp\llama-server.exe -m .\models\mistral-7b-instruct-v0.2.Q2_K.gguf --host 0.0.0.0 --port 8080 -t 4
```

### View All Options
```powershell
.\llama.cpp\llama-server.exe --help
```

## Stopping the Server

Press `Ctrl+C` in the PowerShell window where the server is running.
