# Quick Start Guide

## You've Downloaded the Files - Now What?

Since you already have:
1. ✅ Llama.cpp Windows x64 binaries
2. ✅ Mistral 7B model file

Follow these simple steps:

## Step 1: Organize Files

Create folders and move your files:

```
llama-docker/
├── llama.cpp/                    ← Extract your downloaded llama.cpp here
│   └── llama-server.exe
└── models/                       ← Move your model here
    └── mistral-7b-instruct-v0.2.Q2_K.gguf
```

**To do this:**

1. Create a `llama.cpp` folder here
2. Extract your downloaded llama.cpp zip file into it
3. Create a `models` folder here  
4. Move your downloaded `.gguf` model file into it

## Step 2: Run the Server

Open PowerShell in this folder and run:

```powershell
.\start-server.ps1
```

That's it! The server will start on http://localhost:8080

## Step 3: Test with Postman

### Option A: Import Collection
1. Open Postman
2. Click "Import"
3. Select `postman-collection.json` from this folder
4. Try the "Simple Text Completion" request

### Option B: Manual Request
Create a new POST request in Postman:

**URL:** `http://localhost:8080/completion`

**Headers:**
- Content-Type: `application/json`

**Body (raw JSON):**
```json
{
  "prompt": "What is artificial intelligence?",
  "n_predict": 128,
  "temperature": 0.7
}
```

Click "Send" and you'll get a response!

## Common Issues

### "llama-server.exe not found"
- Extract the llama.cpp zip file into the `llama.cpp` folder
- The exe might be called `server.exe` instead - that's fine

### "Model not found"
- Make sure the model file is in the `models` folder
- Check the filename matches exactly

### Need Help?
Check [RUN-WINDOWS.md](RUN-WINDOWS.md) for detailed instructions.

---

## Don't Want to Use Windows Binaries?

If you prefer Docker instead, see [README.md](README.md) - but since you have the Windows binaries already, running natively is faster and easier!
