# CLI Agent Testing Commands

## Prerequisites

Make sure you have the environment variables set. You can either:
1. Use the `.env` file in `apps/cli/.env`
2. Export them in your shell

## Build the CLI

```bash
cd /home/guepard/work/qwery-core/apps/cli
pnpm build
```

## Test with Google Sheet Query

### Option 1: Using environment variables inline

```bash
cd /home/guepard/work/qwery-core/apps/cli
export AZURE_API_KEY="3894e814ba674c0fa20b932c67334c1c"
export AZURE_RESOURCE_NAME="guepard-agent-rs"
export AZURE_OPENAI_DEPLOYMENT="gpt-5-mini"
export VITE_AGENT_PROVIDER="azure"
export AGENT_PROVIDER="azure"
export VITE_WORKING_DIR="workspace"
export WORKING_DIR="workspace"

# Test the Google Sheet query
echo "list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv" | node dist/index.js
```

### Option 2: Using .env file (recommended)

Make sure your `apps/cli/.env` file has:
```
VITE_AGENT_PROVIDER=azure
AGENT_PROVIDER=azure
AZURE_API_KEY=3894e814ba674c0fa20b932c67334c1c
AZURE_RESOURCE_NAME=guepard-agent-rs
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini
VITE_WORKING_DIR=workspace
WORKING_DIR=workspace
```

Then run:
```bash
cd /home/guepard/work/qwery-core/apps/cli
echo "list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv" | node dist/index.js
```

### Option 3: Interactive Mode

Start the interactive CLI and type your query:

```bash
cd /home/guepard/work/qwery-core/apps/cli
node dist/index.js
```

Then in the interactive prompt, type:
```
list all data in this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv
```

## Expected Output

You should see:
1. The query displayed in a box
2. A message indicating Google Sheet detection
3. Streaming response with the data from the sheet
4. Clean formatted output showing all rows

## Other Test Queries

You can also test with other Google Sheets or natural language queries:

```bash
# Test with a different query
echo "show me the average score from this sheet https://docs.google.com/spreadsheets/d/1yfjcBF4X8waukFdI5u9ctkagFwAn-BRgM5IUCUK1Ay8/export?fomat=csv" | node dist/index.js

# Test with a simple greeting (should use greeting agent)
echo "hello" | node dist/index.js
```

## Troubleshooting

If you see errors:
- Check that all environment variables are set
- Verify the Azure API credentials are correct
- Make sure `workspace` directory exists or is writable
- Check that `@duckdb/node-api` is installed: `pnpm --filter cli list @duckdb/node-api`

