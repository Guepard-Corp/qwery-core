# CLI Test Commands

## Setup

```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
export AZURE_API_KEY="your-key"
export AZURE_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_DEPLOYMENT_ID="gpt-4o-mini"
export AZURE_API_VERSION="2024-04-01-preview"
```

## Helper Functions

Add this helper to silence pnpm and return clean JSON:

```bash
# Run CLI with pnpm --silent to avoid extra logs
run_cli() {
  pnpm --silent --filter cli start "$@"
}
```

## Test Commands

### 1. Create Datasource

```bash
DS_OUTPUT=$(run_cli datasource create "Prod Postgres" \
  --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" \
  --description "Primary Postgres instance" \
  --skip-test \
  --format json)
DS_ID=$(echo "$DS_OUTPUT" | jq -r '.id')
echo "Datasource ID: $DS_ID"
```

### 2. List Datasources

```bash
run_cli datasource list --format json | jq '.'
```

### 3. Test Datasource Connection

```bash
pnpm --silent --filter cli start datasource test "$DS_ID"
```

### 4. Create Notebook

```bash
NOTEBOOK_OUTPUT=$(run_cli notebook create "Remote Analysis" \
  --description "Investigate Prod Postgres" \
  --format json)
NOTEBOOK_ID=$(echo "$NOTEBOOK_OUTPUT" | jq -r '.id')
echo "Notebook ID: $NOTEBOOK_ID"
```

### 5. Add Prompt Cell

```bash
run_cli notebook add-cell "$NOTEBOOK_ID" \
  --type prompt \
  --datasources "$DS_ID" \
  --query "List total number of schemas" \
  --format json | jq '.'
```

### 6. Run SQL Query

```bash
run_cli notebook run "$NOTEBOOK_ID" \
  --cell 1 \
  --mode sql \
  --query "SELECT current_database(), current_schema();" \
  --datasource "$DS_ID" \
  --format json | jq '.'
```

### 7. Run Natural Language Query

```bash
run_cli notebook run "$NOTEBOOK_ID" \
  --cell 1 \
  --mode natural \
  --datasource "$DS_ID" \
  --update-cell \
  --format json | jq '.'
```

## Alternative: Use the Test Script

```bash
cd apps/cli
./test-commands.sh
```

## Direct Node Execution (No pnpm Output)

If you want to avoid pnpm output entirely:

```bash
# Build first
pnpm --filter cli build

# Then use node directly
node apps/cli/dist/index.js datasource create "Prod Postgres" \
  --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" \
  --format json | jq '.'
```

