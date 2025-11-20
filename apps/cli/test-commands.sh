#!/usr/bin/env bash
set -euo pipefail

# Test commands for CLI
# Usage: ./test-commands.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Run CLI command quietly (pnpm --silent suppresses extra logs)
run_cli() {
  pnpm --silent --filter cli start "$@"
}

echo -e "${GREEN}=== CLI Test Suite ===${NC}\n"

# Set environment variables (adjust as needed)
export NODE_TLS_REJECT_UNAUTHORIZED=0

# 1. Create datasource
echo -e "${YELLOW}1. Creating datasource...${NC}"
DS_OUTPUT=$(run_cli datasource create "Prod Postgres" \
  --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" \
  --description "Primary Postgres instance" \
  --skip-test \
  --format json)
echo "$DS_OUTPUT"
DS_ID=$(echo "$DS_OUTPUT" | jq -r '.id')
echo -e "${GREEN}✓ Datasource ID: $DS_ID${NC}\n"

# 2. List datasources
echo -e "${YELLOW}2. Listing datasources...${NC}"
run_cli datasource list --format json | jq '.'
echo ""

# 3. Test datasource connection
echo -e "${YELLOW}3. Testing datasource connection...${NC}"
pnpm --silent --filter cli start datasource test "$DS_ID" 2>&1 | grep -v "Warning:"
echo ""

# 4. Create notebook
echo -e "${YELLOW}4. Creating notebook...${NC}"
NOTEBOOK_OUTPUT=$(run_cli notebook create "Remote Analysis" \
  --description "Investigate Prod Postgres" \
  --format json)
echo "$NOTEBOOK_OUTPUT"
NOTEBOOK_ID=$(echo "$NOTEBOOK_OUTPUT" | jq -r '.id')
echo -e "${GREEN}✓ Notebook ID: $NOTEBOOK_ID${NC}\n"

# 5. Add prompt cell
echo -e "${YELLOW}5. Adding prompt cell...${NC}"
run_cli notebook add-cell "$NOTEBOOK_ID" \
  --type prompt \
  --datasources "$DS_ID" \
  --query "List total number of schemas" \
  --format json | jq '.'
echo ""

# 6. Run SQL query directly
echo -e "${YELLOW}6. Running SQL query...${NC}"
run_cli notebook run "$NOTEBOOK_ID" \
  --cell 1 \
  --mode sql \
  --query "SELECT current_database(), current_schema();" \
  --datasource "$DS_ID" \
  --format json 2>/dev/null | jq '.'
echo ""

# 7. Run natural language query (requires Azure env vars)
if [ -n "${AZURE_API_KEY:-}" ] && [ -n "${AZURE_ENDPOINT:-}" ]; then
  echo -e "${YELLOW}7. Running natural language query...${NC}"
  run_cli notebook run "$NOTEBOOK_ID" \
    --cell 1 \
    --mode natural \
    --datasource "$DS_ID" \
    --update-cell \
    --format json 2>/dev/null | jq '.'
  echo ""
else
  echo -e "${YELLOW}7. Skipping natural language query (AZURE_API_KEY/AZURE_ENDPOINT not set)${NC}\n"
fi

echo -e "${GREEN}=== Test Suite Complete ===${NC}"

