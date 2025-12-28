# Local LLM Integration - Quick Start

## Local LLM: LM Studio

This project has been integrated with **LM Studio** as the local LLM provider, replacing cloud-based Azure OpenAI dependencies.

## Quick Setup

### 1. Install LM Studio

Download and install LM Studio from [lmstudio.ai](https://lmstudio.ai/)

### 2. Start LM Studio Server

1. Open LM Studio
2. Download and load the `llama-3.2-3b-instruct` model (or any compatible model)
3. Click "Start Server" (default port: 1234)
4. Verify the server is running at `http://127.0.0.1:1234/v1`

### 3. Configure Environment

Create or update your `.env` file:

```bash
# LM Studio Configuration (optional - defaults provided)
LMSTUDIO_BASE_URL=http://127.0.0.1:1234/v1
LMSTUDIO_MODEL=llama-3.2-3b-instruct
```

**Note**: These are optional. The application uses sensible defaults if not provided.

### 4. Build and Run

```bash
# Build web app
cd apps/web
pnpm build

# Build extensions (from root)
pnpm extensions:build

# Start development server
pnpm dev
```

## Verification

1. **Check LM Studio**: Ensure the local server is running and shows active connections
2. **Test in Qwery**: 
   - Create a datasource
   - Execute a query or prompt
   - Verify requests appear in LM Studio's server logs

## Model Information

- **Provider**: LM Studio
- **Model**: llama-3.2-3b-instruct
- **API**: OpenAI-compatible
- **Endpoint**: `http://127.0.0.1:1234/v1`

## Troubleshooting

**Connection Errors**:
- Ensure LM Studio server is running
- Check that the port matches `LMSTUDIO_BASE_URL` (default: 1234)
- Verify the model is loaded in LM Studio

**Model Not Found**:
- Ensure the model name in `.env` matches the model loaded in LM Studio
- Check that the model is compatible with OpenAI API format

For detailed integration information, see [INTEGRATION.md](./INTEGRATION.md).
