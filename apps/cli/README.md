# Qwery CLI

Command-line interface for Qwery Workspace, providing full functionality for managing datasources, notebooks, and executing queries with natural language support.

## Features

- **Datasource Management**: Create, list, and test PostgreSQL datasources
- **Notebook Management**: Create notebooks and manage cells
- **Query Execution**: Run SQL queries directly or translate natural language to SQL
- **AI-Powered**: Natural language to SQL translation using Azure OpenAI or AWS Bedrock
- **State Persistence**: All data persisted to local file storage

## Installation

The CLI is part of the Qwery monorepo. Build it with:

```bash
pnpm --filter cli build
```

## Usage

### Running Commands

Use pnpm to run commands:

```bash
pnpm --filter cli start <command> [options]
```

Or use the built binary directly:

```bash
node apps/cli/dist/index.js <command> [options]
```

### Helper Function

For cleaner output, add this to your shell:

```bash
run_cli() {
  pnpm --silent --filter cli start "$@"
}
```

## Setup

### Environment Variables

For natural language to SQL translation, configure one of the following:

**Azure OpenAI:**
```bash
export AZURE_API_KEY="your-api-key"
export AZURE_ENDPOINT="https://your-resource.openai.azure.com"
export AZURE_DEPLOYMENT_ID="gpt-4o-mini"  # optional, defaults to gpt-4o-mini
export AZURE_API_VERSION="2024-04-01-preview"  # optional
```

**AWS Bedrock:**
```bash
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export BEDROCK_MODEL_ID="anthropic.claude-3-5-sonnet-20241022-v2:0"  # optional
```

**Provider Selection:**
```bash
export CLI_LLM_PROVIDER="azure"  # or "bedrock"
```

**PostgreSQL SSL:**
For databases with self-signed certificates:
```bash
export NODE_TLS_REJECT_UNAUTHORIZED=0
```

## Commands

### Workspace

Initialize or manage workspace:

```bash
pnpm --filter cli start workspace init
```

### Datasource

#### Create Datasource

Register a new PostgreSQL datasource:

```bash
pnpm --filter cli start datasource create <name> \
  --connection <postgresql://...> \
  [--description <description>] \
  [--provider <provider>] \
  [--driver <driver>] \
  [--project-id <id>] \
  [--skip-test] \
  [--format json|table]
```

**Example:**
```bash
pnpm --filter cli start datasource create "Prod Postgres" \
  --connection "postgresql://user:pass@host:port/db?sslmode=require" \
  --description "Production database" \
  --format json
```

#### List Datasources

List all datasources for the active project:

```bash
pnpm --filter cli start datasource list \
  [--project-id <id>] \
  [--format json|table]
```

#### Test Datasource Connection

Test connection to a registered datasource:

```bash
pnpm --filter cli start datasource test <datasourceId>
```

### Notebook

#### Create Notebook

Create a new notebook:

```bash
pnpm --filter cli start notebook create <title> \
  [--description <description>] \
  [--project-id <id>] \
  [--format json|table]
```

**Example:**
```bash
pnpm --filter cli start notebook create "Data Analysis" \
  --description "Analyze production data" \
  --format json
```

#### List Notebooks

List all notebooks for the active project:

```bash
pnpm --filter cli start notebook list \
  [--project-id <id>] \
  [--format json|table]
```

#### Add Cell

Add a new cell to a notebook:

```bash
pnpm --filter cli start notebook add-cell <notebookId> \
  [--type query|prompt] \
  --datasources <id1,id2,...> \
  --query <text> \
  [--run-mode default|fixit] \
  [--format json|table]
```

**Example:**
```bash
pnpm --filter cli start notebook add-cell <notebook-id> \
  --type prompt \
  --datasources <datasource-id> \
  --query "List all tables in the database" \
  --format json
```

#### Run Cell

Execute a notebook cell:

```bash
pnpm --filter cli start notebook run <notebookId> \
  [--cell <cellId>] \
  [--mode sql|natural] \
  [--query <text>] \
  [--datasource <id>] \
  [--update-cell] \
  [--format json|table]
```

**Options:**
- `--cell`: Cell ID to run (defaults to last cell)
- `--mode`: Execution mode - `sql` for direct SQL, `natural` for NL-to-SQL translation
- `--query`: Override cell query text
- `--datasource`: Override cell datasource
- `--update-cell`: Persist generated SQL back to cell (promotes prompt → query)

**Examples:**

Run SQL query:
```bash
pnpm --filter cli start notebook run <notebook-id> \
  --cell 1 \
  --mode sql \
  --query "SELECT current_database(), current_schema();" \
  --datasource <datasource-id> \
  --format json
```

Run natural language query:
```bash
pnpm --filter cli start notebook run <notebook-id> \
  --cell 1 \
  --mode natural \
  --datasource <datasource-id> \
  --update-cell \
  --format json
```

## Examples

### Complete Workflow

```bash
# 1. Create datasource
DS_OUTPUT=$(run_cli datasource create "Prod Postgres" \
  --connection "postgresql://user:pass@host:port/db?sslmode=require" \
  --format json)
DS_ID=$(echo "$DS_OUTPUT" | jq -r '.id')

# 2. Test connection
run_cli datasource test "$DS_ID"

# 3. Create notebook
NOTEBOOK_OUTPUT=$(run_cli notebook create "Analysis" --format json)
NOTEBOOK_ID=$(echo "$NOTEBOOK_OUTPUT" | jq -r '.id')

# 4. Add prompt cell
run_cli notebook add-cell "$NOTEBOOK_ID" \
  --type prompt \
  --datasources "$DS_ID" \
  --query "List total number of schemas" \
  --format json

# 5. Run natural language query
run_cli notebook run "$NOTEBOOK_ID" \
  --cell 1 \
  --mode natural \
  --datasource "$DS_ID" \
  --update-cell \
  --format json
```

## Testing

Run the complete test suite:

```bash
cd apps/cli
./test-commands.sh
```

This will test:
1. Datasource creation
2. Datasource listing
3. Connection testing
4. Notebook creation
5. Adding cells
6. SQL query execution
7. Natural language query execution (if Azure env vars are set)

See [TEST_COMMANDS.md](./TEST_COMMANDS.md) for detailed test commands.

## Architecture

The CLI follows clean architecture principles:

- **Domain Layer**: Uses `@qwery/domain` for entities and services
- **Infrastructure**: File-based state persistence, PostgreSQL connection handling
- **Application**: Command handlers, use cases orchestration
- **Presentation**: Commander.js for CLI interface

### Key Components

- **CliContainer**: Dependency injection container managing repositories and services
- **NotebookRunner**: Orchestrates cell execution (SQL and natural language)
- **SqlAgent**: Translates natural language to SQL using AI SDK
- **FileStateStore**: Persists state to local JSON file

## State Management

The CLI persists all state to a local file (default: `~/.qwery/cli-state.json`). This includes:
- Users and organizations
- Projects
- Datasources
- Notebooks

State is automatically loaded on startup and saved after each command execution.

## Development

### Build

```bash
pnpm --filter cli build
```

### Type Check

```bash
pnpm --filter cli typecheck
```

### Lint

```bash
pnpm --filter cli lint
pnpm --filter cli lint:fix
```

### Format

```bash
pnpm --filter cli format:fix
```

## License

Part of the Qwery Workspace monorepo.

