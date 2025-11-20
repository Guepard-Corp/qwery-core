#!/usr/bin/env bash
set -euo pipefail

# Test both WebLLM and Azure providers
# Usage: ./test-both-providers.sh

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

run_cli() {
  pnpm --silent --filter cli start "$@" 2>/dev/null
}

export NODE_TLS_REJECT_UNAUTHORIZED=0

echo -e "${GREEN}=== Testing Both LLM Providers ===${NC}\n"

# Setup datasource
echo -e "${YELLOW}Setting up datasource...${NC}"
DS_OUTPUT=$(run_cli datasource list --format json | jq -r '.[0].id // empty')
if [ -z "$DS_OUTPUT" ]; then
  DS_OUTPUT=$(run_cli datasource create "Test DB" \
    --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" \
    --skip-test \
    --format json)
  DS_ID=$(echo "$DS_OUTPUT" | jq -r '.id')
else
  DS_ID="$DS_OUTPUT"
fi
echo -e "${GREEN}✓ Datasource: $DS_ID${NC}\n"

# Test 1: Azure Provider
if [ -n "${AZURE_API_KEY:-}" ] && [ -n "${AZURE_ENDPOINT:-}" ]; then
  echo -e "${YELLOW}=== Test 1: Azure Provider ===${NC}"
  export CLI_LLM_PROVIDER=azure
  
  NOTEBOOK_OUTPUT=$(run_cli notebook create "Azure Test" --format json)
  NOTEBOOK_ID=$(echo "$NOTEBOOK_OUTPUT" | jq -r '.id')
  
  run_cli notebook add-cell "$NOTEBOOK_ID" \
    --type prompt \
    --datasources "$DS_ID" \
    --query "Count the total number of schemas" \
    --format json > /dev/null
  
  echo "Running NL query with Azure..."
  RESULT=$(run_cli notebook run "$NOTEBOOK_ID" \
    --cell 1 \
    --mode natural \
    --datasource "$DS_ID" \
    --format json)
  
  SQL=$(echo "$RESULT" | jq -r '.sql // empty')
  ROW_COUNT=$(echo "$RESULT" | jq -r '.rowCount // 0')
  
  if [ -n "$SQL" ] && [ "$SQL" != "null" ] && [ "$ROW_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ Azure: SQL generated and executed${NC}"
    echo "  SQL: $SQL" | head -c 100
    echo "..."
    echo -e "  Rows: $ROW_COUNT\n"
  else
    echo -e "${RED}✗ Azure test failed${NC}\n"
  fi
else
  echo -e "${YELLOW}⚠ Skipping Azure test (env vars not set)${NC}\n"
fi

# Test 2: WebLLM Provider (expected to be rejected in CLI)
echo -e "${YELLOW}=== Test 2: WebLLM Provider (Browser-only) ===${NC}"
echo "WebLLM relies on browser APIs, so the CLI should refuse to run it."
export CLI_LLM_PROVIDER=webllm

NOTEBOOK_OUTPUT=$(run_cli notebook create "WebLLM Test" --format json)
NOTEBOOK_ID=$(echo "$NOTEBOOK_OUTPUT" | jq -r '.id')

run_cli notebook add-cell "$NOTEBOOK_ID" \
  --type prompt \
  --datasources "$DS_ID" \
  --query "Count the total number of schemas" \
  --format json > /dev/null

echo "Attempting to run WebLLM (should show a helpful error)..."
set +e
RESULT=$(run_cli notebook run "$NOTEBOOK_ID" \
  --cell 1 \
  --mode natural \
  --datasource "$DS_ID" \
  --format json 2>&1)
STATUS=$?
set -e

if [ "$STATUS" -eq 0 ]; then
  echo -e "${RED}✗ WebLLM unexpectedly succeeded in CLI${NC}"
  echo "$RESULT" | head -n 20
  exit 1
fi

if echo "$RESULT" | grep -qi "WebLLM provider is not supported"; then
  echo -e "${GREEN}✓ WebLLM correctly rejected with helpful error${NC}"
else
  echo -e "${YELLOW}⚠ WebLLM rejection message missing${NC}"
  echo "$RESULT" | head -n 20
fi

echo -e "${GREEN}=== Test Complete ===${NC}"

