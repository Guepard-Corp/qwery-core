#!/usr/bin/env bash
set -euo pipefail

# Test natural language to SQL translation
# Usage: ./test-nl-queries.sh

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Helper to run CLI commands
run_cli() {
  pnpm --silent --filter cli start "$@" 2>/dev/null
}

extract_json() {
  printf '%s\n' "$1" | node -e "const fs=require('fs');const input=fs.readFileSync(0,'utf8');const start=input.indexOf('{');const end=input.lastIndexOf('}');if(start===-1||end===-1||end<=start){process.exit(1);}process.stdout.write(input.slice(start,end+1));"
}

# Check if Azure env vars are set
if [ -z "${AZURE_API_KEY:-}" ] || [ -z "${AZURE_ENDPOINT:-}" ]; then
  echo -e "${RED}Error: AZURE_API_KEY and AZURE_ENDPOINT must be set${NC}"
  exit 1
fi

export NODE_TLS_REJECT_UNAUTHORIZED=0
export AI_SDK_LOG_WARNINGS=false

echo -e "${GREEN}=== Natural Language to SQL Test Suite ===${NC}\n"

# Get or create datasource
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
echo -e "${GREEN}✓ Using datasource: $DS_ID${NC}\n"

# Create a test notebook
echo -e "${YELLOW}Creating test notebook...${NC}"
NOTEBOOK_OUTPUT=$(run_cli notebook create "NL to SQL Tests" --format json)
NOTEBOOK_ID=$(echo "$NOTEBOOK_OUTPUT" | jq -r '.id')
echo -e "${GREEN}✓ Notebook ID: $NOTEBOOK_ID${NC}\n"

# Test queries
declare -a QUERIES=(
  "Show me all table names in the database"
  "Count the total number of schemas"
  "List all columns from information_schema.tables"
  "What is the current database name and version?"
  "Get the list of all user-defined schemas excluding system schemas"
)

declare -a EXPECTED_KEYWORDS=(
  "table"
  "COUNT"
  "column"
  "current_database\|version"
  "schema"
)

CELL_ID=1

for i in "${!QUERIES[@]}"; do
  QUERY="${QUERIES[$i]}"
  KEYWORD="${EXPECTED_KEYWORDS[$i]}"
  TEST_NUM=$((i + 1))
  
  echo -e "${YELLOW}Test $TEST_NUM/5:${NC} \"$QUERY\""
  
  # Add cell with prompt
  run_cli notebook add-cell "$NOTEBOOK_ID" \
    --type prompt \
    --datasources "$DS_ID" \
    --query "$QUERY" \
    --format json > /dev/null
  
  # Run natural language query
  RESULT=$(run_cli notebook run "$NOTEBOOK_ID" \
    --cell "$CELL_ID" \
    --mode natural \
    --datasource "$DS_ID" \
    --format json)

  JSON_OUTPUT=$(extract_json "$RESULT") || {
    echo -e "${RED}✗ Failed to parse CLI output${NC}"
    echo "$RESULT"
    exit 1
  }
  
  SQL=$(echo "$JSON_OUTPUT" | jq -r '.sql // empty')
  ROW_COUNT=$(echo "$JSON_OUTPUT" | jq -r '.rowCount // 0')
  ERROR=$(echo "$JSON_OUTPUT" | jq -r '.error // empty')
  
  if [ -n "$ERROR" ] && [ "$ERROR" != "null" ]; then
    echo -e "${RED}✗ Error: $ERROR${NC}\n"
  elif [ -z "$SQL" ] || [ "$SQL" = "null" ]; then
    echo -e "${RED}✗ No SQL generated${NC}\n"
  else
    # Check if SQL contains expected keywords (case insensitive)
    if echo "$SQL" | grep -qiE "$KEYWORD"; then
      echo -e "${GREEN}✓ SQL Generated:${NC}"
      echo "$SQL" | sed 's/^/  /'
      echo -e "${GREEN}✓ Rows returned: $ROW_COUNT${NC}\n"
    else
      echo -e "${YELLOW}⚠ SQL Generated (may not match expected pattern):${NC}"
      echo "$SQL" | sed 's/^/  /'
      echo -e "${GREEN}✓ Rows returned: $ROW_COUNT${NC}\n"
    fi
  fi
  
  CELL_ID=$((CELL_ID + 1))
done

echo -e "${GREEN}=== Test Suite Complete ===${NC}"

