# Qwery CLI

A command-line interface for managing Qwery workspaces, datasources, notebooks, and executing SQL queries interactively.

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Features](#features)
- [Usage Examples](#usage-examples)
- [Interactive REPL Mode](#interactive-repl-mode)
- [Data Storage](#data-storage)
- [Troubleshooting](#troubleshooting)

## Quick Start

1. **Build the CLI:**
   ```bash
   pnpm --filter cli build
   ```

2. **Install globally:**
   ```bash
   cd apps/cli
   pnpm link --global
   ```

3. **Verify installation:**
   ```bash
   qwery --help
   ```

4. **Initialize workspace:**
   ```bash
   qwery workspace init
   ```

5. **Start querying:**
   ```bash
   qwery  # Opens interactive REPL mode
   ```

## Installation

### Prerequisites

- **Node.js** >= 22.0.0
- **pnpm** >= 9.0.0 (install with `corepack enable pnpm`)

### Step-by-Step Installation

#### 1. Build the CLI

From the repository root:

```bash
pnpm --filter cli build
```

**Note:** Rebuild after any code changes:
```bash
pnpm --filter cli build
```

#### 2. Global Installation

Navigate to the CLI directory and link globally:

```bash
cd apps/cli
pnpm link --global
```

#### 3. Verify PATH

pnpm will print the global directory path. Ensure it's on your `PATH`:

- **Linux/macOS:** Usually `~/.local/share/pnpm/global/5`
- **Windows:** Usually `%LOCALAPPDATA%\pnpm\global\5`

If you used `corepack enable pnpm`, the PATH is already configured.

#### 4. Verify Installation

Test that the CLI is accessible:

```bash
qwery --help
qwery workspace show
```

### Platform-Specific Notes

#### Windows

- Run commands in **elevated PowerShell** or **Developer PowerShell for VS Code**
- If `qwery` is not recognized, restart your shell or run `refreshenv` (Scoop/Chocolatey)

#### macOS / Linux

- Ensure `~/.local/share/pnpm` is in your shell's PATH (add to `.zshrc`, `.bashrc`, etc.)
- If you get `EACCES` errors, run `pnpm setup` first, then retry `pnpm link --global`

## Features

### Workspace Management

- Initialize workspace context
- View current workspace state
- Manage projects and organizations

### Datasource Management

- Create datasources from connection strings
- List and test datasource connections
- Support for PostgreSQL (extensible to other databases)

### Notebook Management

- Create and manage notebooks
- Add SQL cells to notebooks
- Execute notebook cells
- Run custom queries

### Interactive REPL Mode

- Conversational query interface (Cursor CLI style)
- Direct SQL execution
- Context-aware prompts
- Command history

## Usage Examples

### Basic Workflow

#### 1. Initialize Workspace

```bash
qwery workspace init
```

This creates a new workspace with a default user, organization, and project.

#### 2. Create a Datasource

```bash
qwery datasource create my-db \
  --connection "postgresql://user:password@host:5432/database?sslmode=require" \
  --description "My production database"
```

#### 3. List Datasources

```bash
qwery datasource list
```

Copy the `id` from the output for use in other commands.

#### 4. Test Connection

```bash
qwery datasource test <datasource-id>
```

#### 5. Create a Notebook

```bash
qwery notebook create my-notes --description "My query notebook"
```

#### 6. Add a SQL Cell

```bash
qwery notebook add-cell <notebook-id> \
  --datasources <datasource-id> \
  --query "SELECT current_date, version()"
```

#### 7. Run Notebook Cell

```bash
qwery notebook run <notebook-id>
```

### Output Formats

Most commands support `--format json` for JSON output:

```bash
qwery datasource list --format json
qwery notebook list --format json
qwery workspace show --format json
```

## Interactive REPL Mode

Run `qwery` with no arguments to enter an interactive console where you can query directly.

### Getting Started

```bash
$ qwery

qwery> 
```

### Available Commands

- `/help` - Show help message
- `/exit` - Exit the REPL
- `/clear` - Clear the screen
- `/use <datasource-id>` - Select a datasource to query

### Example Session

```bash
$ qwery

qwery> /help
Available commands:
  /help              Show this help message
  /exit              Exit the REPL
  /clear             Clear the screen
  /use <datasource-id>  Select a datasource to query

Just type your query directly - SQL or natural language.

qwery> /use d7d411d0-8fbf-46a8-859d-7aca6abfad14
✓ Using datasource: my-database

qwery [my-database]> SELECT current_date

┌──────────────┐
│ current_date │
├──────────────┤
│ 2025-11-21   │
└──────────────┘

(1 row)

qwery [my-database]> SELECT version()

┌─────────────────────────────────────────────┐
│ version                                      │
├─────────────────────────────────────────────┤
│ PostgreSQL 15.4 on x86_64-pc-linux-gnu     │
└─────────────────────────────────────────────┘

(1 row)

qwery [my-database]> /exit
Goodbye!
```

### Features

- **Empty input allowed** - Just press Enter to see the prompt again
- **SQL auto-detection** - Queries starting with SQL keywords (`SELECT`, `INSERT`, etc.) are automatically detected
- **Context-aware prompt** - Shows current datasource: `qwery [datasource-name]>`
- **Natural language** - Coming soon (requires SqlAgent)

## Complete Example: Angry Star Database

Full walkthrough using a real PostgreSQL connection:

### Step 1: Initialize Workspace

```bash
qwery workspace init
```

### Step 2: Create Datasource

```bash
qwery datasource create angry-star \
  --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" \
  --description "Angry star prod"
```

### Step 3: List and Test

```bash
# List datasources (copy the ID)
qwery datasource list

# Test connection (replace <datasource-id> with actual ID)
qwery datasource test <datasource-id>
```

### Step 4: Create Notebook

```bash
qwery notebook create angry-notes --description "Angry Star test notebook"
```

### Step 5: Add and Run Cells

```bash
# List notebooks to get notebook ID
qwery notebook list

# Add a cell (replace <notebook-id> and <datasource-id>)
qwery notebook add-cell <notebook-id> \
  --datasources <datasource-id> \
  --query "SELECT current_date, version()"

# Run the notebook
qwery notebook run <notebook-id>
```

### Step 6: Interactive Mode

```bash
# Enter interactive mode
qwery

# Inside REPL:
/use <datasource-id>
SELECT current_date
SELECT version()
SELECT COUNT(*) FROM pg_database
SELECT datname FROM pg_database LIMIT 5
/exit
```

## Data Storage

All CLI data is stored locally in:

**`~/.qwery/cli-state.json`**

- **Linux/macOS:** `/home/<username>/.qwery/cli-state.json`
- **Windows:** `C:\Users\<username>\.qwery\cli-state.json`

This file contains:
- Workspace state (user, organization, project IDs)
- All datasources (including connection strings)
- All notebooks and cells
- Users and organizations

### View State File Location

```bash
qwery workspace show
```

The `stateFile` field shows the exact path.

### Clear State (Start Fresh)

```bash
rm ~/.qwery/cli-state.json
```

Then reinitialize:
```bash
qwery workspace init
```

## Troubleshooting

### Command Not Found

**Problem:** `qwery` command not recognized

**Solutions:**
1. Verify PATH includes pnpm global directory:
   ```bash
   pnpm bin -g
   ```
2. Restart your terminal/shell
3. Re-link the CLI:
   ```bash
   cd apps/cli
   pnpm link --global
   ```

### Build Errors

**Problem:** Build fails with TypeScript errors

**Solution:**
```bash
pnpm --filter cli typecheck
pnpm --filter cli lint
```

### Connection Errors

**Problem:** Datasource connection fails

**Solutions:**
1. Verify connection string format
2. Check network connectivity
3. Verify SSL mode settings (`sslmode=require` for secure connections)
4. Test connection:
   ```bash
   qwery datasource test <datasource-id>
   ```

### State File Issues

**Problem:** CLI state seems corrupted

**Solution:**
1. Backup current state:
   ```bash
   cp ~/.qwery/cli-state.json ~/.qwery/cli-state.json.backup
   ```
2. Clear and reinitialize:
   ```bash
   rm ~/.qwery/cli-state.json
   qwery workspace init
   ```

## Update / Uninstall

### Update After Code Changes

```bash
pnpm --filter cli build
cd apps/cli
pnpm link --global
```

### Uninstall

```bash
cd apps/cli
pnpm unlink --global cli
```

## Command Reference

### Workspace Commands

```bash
qwery workspace init              # Initialize workspace
qwery workspace show             # Show current workspace
qwery workspace show --format json  # JSON output
```

### Datasource Commands

```bash
qwery datasource create <name> --connection "<url>" --description "<desc>"
qwery datasource list
qwery datasource list --format json
qwery datasource test <datasource-id>
```

### Notebook Commands

```bash
qwery notebook create <title> --description "<desc>"
qwery notebook list
qwery notebook add-cell <notebook-id> --datasources <id> --query "<sql>"
qwery notebook run <notebook-id>
qwery notebook run <notebook-id> --cell <cell-id>
qwery notebook run <notebook-id> --query "<sql>"
```

### Project Commands

```bash
qwery project list
qwery project create <name> --description "<desc>" --organization-id <id>
qwery project delete <project-id> --force
```

## Development

### Running Tests

```bash
pnpm --filter cli test
```

### Type Checking

```bash
pnpm --filter cli typecheck
```

### Linting

```bash
pnpm --filter cli lint
pnpm --filter cli lint:fix
```

## License

Part of the Qwery project.
