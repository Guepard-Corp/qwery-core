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

### Environment Variables

The CLI requires environment variables for the AI agent to work. Create a `.env` file in `apps/cli/`:

```bash
# Query Agent Configuration
VITE_AGENT_PROVIDER=azure
AGENT_PROVIDER=azure

# Azure OpenAI Configuration
AZURE_API_KEY=your-azure-api-key
AZURE_RESOURCE_NAME=your-azure-resource-name
AZURE_OPENAI_DEPLOYMENT=gpt-5-mini

# Workspace Directory (for Google Sheets support)
VITE_WORKING_DIR=workspace
WORKING_DIR=workspace
```

See `.env.example` for a complete template.

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

- **Cursor CLI-style interface** - Beautiful, conversational query interface
- **All CLI commands available** - Run any command directly in interactive mode
- **Direct SQL execution** - Type SQL queries and get instant results
- **Context-aware prompts** - Shows current datasource in prompt
- **Beautiful formatting** - Brand-colored boxes and perfectly aligned tables
- **Command history** - Up/down arrow navigation

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

Run `qwery` with no arguments to enter an interactive console (Cursor CLI style) where you can run any CLI command or execute SQL queries directly.

### Getting Started

```bash
$ qwery

┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Welcome to Qwery CLI Interactive Mode!             │
│                                                     │
│  Type /help to see available commands.              │
│  Type /use <datasource-id> to select a datasource.  │
│  Just type SQL queries directly to execute them.    │
└───────────────────────────────────────────────────┘

qwery> 
```

### REPL Commands

- `/help` - Show comprehensive help with all available commands
- `/exit` - Exit the REPL
- `/clear` - Clear the screen and show welcome message
- `/use <datasource-id>` - Select a datasource to query

### All CLI Commands Available

Every CLI command works in interactive mode! Just type the command directly:

```bash
qwery> workspace init
qwery> datasource create my-db --connection "postgresql://..."
qwery> datasource list
qwery> notebook create my-notes --description "Test"
qwery> notebook add-cell <id> --datasources <id> --query "SELECT 1"
qwery> project list
```

### Example Session

```bash
$ qwery

qwery> /help
# Shows beautiful help box with all commands

qwery> workspace init
# Initialize workspace (works in interactive mode!)

qwery> datasource create angry-star \
  --connection "postgresql://postgres:YUX5he1NC3cn@angry-star-sooomu.us-west-aws.db.guepard.run:22050/postgres?sslmode=require" \
  --description "Angry star prod"

┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Datasource created successfully                   │
└───────────────────────────────────────────────────┘

qwery> datasource list
# Shows perfectly aligned table with brand color borders

qwery> /use <datasource-id>
┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Using datasource: angry-star                      │
│  Provider: postgresql                              │
└───────────────────────────────────────────────────┘

qwery [angry-star]> SELECT current_date

┌───────────────────────────────────────────────────┐
│ Query                                             │
├───────────────────────────────────────────────────┤
│  SELECT current_date                              │
└───────────────────────────────────────────────────┘

┌──────────────┐
│ current_date │
├──────────────┤
│ 2025-11-21   │
└──────────────┘

┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Query executed successfully.                     │
│                                                     │
│  1 row returned                                    │
└───────────────────────────────────────────────────┘

────────────────────────────────────────────
qwery [angry-star]> /exit
┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Goodbye! See you next time!                       │
└───────────────────────────────────────────────────┘
```

### Features

- **Beautiful formatting** - Brand-colored boxes (#2596be) with perfectly aligned text
- **All CLI commands** - Every command works in interactive mode
- **Empty input allowed** - Just press Enter to see the prompt again (Cursor CLI behavior)
- **SQL auto-detection** - Queries starting with SQL keywords are automatically detected
- **Context-aware prompt** - Shows current datasource: `qwery [datasource-name]>`
- **Perfect table alignment** - Custom table formatter ensures all columns align correctly
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

# Inside REPL - all commands work:
workspace show
datasource list
notebook create test --description "Test notebook"
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

All commands work both in regular CLI mode and interactive REPL mode.

### Workspace Commands

```bash
qwery workspace init              # Initialize workspace
qwery workspace show             # Show current workspace
qwery workspace show --format json  # JSON output

# In interactive mode:
qwery> workspace init
qwery> workspace show
```

### Datasource Commands

```bash
qwery datasource create <name> --connection "<url>" --description "<desc>"
qwery datasource list
qwery datasource list --format json
qwery datasource test <datasource-id>

# In interactive mode:
qwery> datasource create my-db --connection "postgresql://..."
qwery> datasource list
qwery> datasource test <id>
```

### Notebook Commands

```bash
qwery notebook create <title> --description "<desc>"
qwery notebook list
qwery notebook add-cell <notebook-id> --datasources <id> --query "<sql>"
qwery notebook run <notebook-id>
qwery notebook run <notebook-id> --cell <cell-id>
qwery notebook run <notebook-id> --query "<sql>"

# In interactive mode:
qwery> notebook create my-notes --description "Test"
qwery> notebook list
qwery> notebook add-cell <id> --datasources <id> --query "SELECT 1"
qwery> notebook run <id>
```

### Project Commands

```bash
qwery project list
qwery project create <name> --description "<desc>" --organization-id <id>
qwery project delete <project-id> --force

# In interactive mode:
qwery> project list
qwery> project create test --description "Test project" --organization-id <id>
qwery> project delete <id> --force
```

## UI Design

The CLI uses a beautiful, consistent design system:

- **Brand Color:** #2596be (used for all borders, prompts, and highlights)
- **Text Color:** White (for all content)
- **Success:** Green (for success messages)
- **Error:** Red (for error messages)
- **Warning:** Yellow (for warnings)

All output is formatted with:
- Perfectly aligned tables with custom formatter
- Beautiful box borders with brand color
- Consistent spacing and padding
- ANSI color code handling for accurate alignment

## Development

### Running Tests

```bash
pnpm --filter cli test
```

Runs 56 unit tests with 82% code coverage.

### Type Checking

```bash
pnpm --filter cli typecheck
```

### Linting

```bash
pnpm --filter cli lint
pnpm --filter cli lint:fix
```

### Rebuild After Changes

After making code changes, rebuild and relink:

```bash
pnpm --filter cli build
cd apps/cli
pnpm link --global
```

## License

Part of the Qwery project.
