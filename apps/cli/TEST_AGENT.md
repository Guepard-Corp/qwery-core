# Testing the Agent Integration

This guide shows how to test if the AI agent is working in the CLI.

## Prerequisites

1. **Set Environment Variables**

   The agent needs Azure credentials (or other provider credentials):

   ```bash
   export AZURE_API_KEY="your-azure-api-key"
   export AZURE_RESOURCE_NAME="your-azure-resource-name"
   export AZURE_OPENAI_DEPLOYMENT="gpt-5-mini"  # Optional, defaults to model name
   export AGENT_PROVIDER="azure"  # Optional, defaults to 'azure'
   ```

   Or use `VITE_AGENT_PROVIDER` if you prefer:

   ```bash
   export VITE_AGENT_PROVIDER="azure"
   ```

2. **Build the CLI**

   ```bash
   cd apps/cli
   pnpm build
   ```

## Testing Steps

### Step 1: Initialize Workspace

```bash
qwery workspace init
```

### Step 2: Create a Datasource

```bash
qwery datasource create test-db \
  --connection "postgresql://user:password@host:5432/database?sslmode=require" \
  --description "Test database"
```

Copy the datasource ID from the output.

### Step 3: Test Connection (Optional)

```bash
qwery datasource test <datasource-id>
```

### Step 4: Enter Interactive Mode

```bash
qwery
```

### Step 5: Select Datasource

```bash
qwery> /use <datasource-id>
```

You should see:
```
┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Using datasource: test-db                        │
│  Provider: postgresql                              │
└───────────────────────────────────────────────────┘
```

The prompt should change to: `qwery [test-db]>`

### Step 6: Test Natural Language Query

Type a natural language query (NOT starting with SQL keywords):

```bash
qwery [test-db]> show me all users
```

Or:

```bash
qwery [test-db]> how many records are in the users table
```

Or:

```bash
qwery [test-db]> what are the top 10 customers
```

## Expected Behavior

### ✅ If Agent is Working:

1. The query will be converted to SQL automatically
2. You'll see the generated SQL query in a box
3. The query will be executed
4. Results will be displayed in a formatted table

Example output:
```
┌───────────────────────────────────────────────────┐
│ Query                                             │
├───────────────────────────────────────────────────┤
│  SELECT * FROM users                              │
└───────────────────────────────────────────────────┘

┌──────┬─────────────┬──────────────┐
│ id   │ name        │ email        │
├──────┼─────────────┼──────────────┤
│ 1    │ John Doe    │ john@example │
│ 2    │ Jane Smith  │ jane@example │
└──────┴─────────────┴──────────────┘

┌───────────────────────────────────────────────────┐
│                     ✓ Success                     │
├───────────────────────────────────────────────────┤
│  Query executed successfully.                     │
│                                                     │
│  2 rows returned                                    │
└───────────────────────────────────────────────────┘
```

### ❌ If Agent is NOT Working:

You'll see an error message. Common issues:

1. **Missing Environment Variables:**
   ```
   Error: [AgentFactory][Azure provider] Missing required environment variable 'AZURE_API_KEY'.
   ```
   **Solution:** Set the environment variables as shown in Prerequisites.

2. **Model Resolution Failed:**
   ```
   Error: [AgentFactory] Unsupported provider 'xyz'
   ```
   **Solution:** Check that `AGENT_PROVIDER` is set to a supported value: `azure`, `ollama`, or `webllm`.

3. **Database Connection Failed:**
   ```
   Error: Agent not initialized. Call initialize() with a datasource first.
   ```
   **Solution:** Make sure you've selected a datasource with `/use <datasource-id>`.

4. **API Error:**
   ```
   Error: Azure API error: 401 Unauthorized
   ```
   **Solution:** Check that your `AZURE_API_KEY` and `AZURE_RESOURCE_NAME` are correct.

## Testing SQL Mode (Baseline)

To verify the CLI is working at all, test with a direct SQL query:

```bash
qwery [test-db]> SELECT current_date
```

This should work regardless of agent setup and confirms the basic CLI functionality.

## Debugging

### Check Environment Variables

```bash
echo $AZURE_API_KEY
echo $AZURE_RESOURCE_NAME
echo $AGENT_PROVIDER
```

### Check Agent Factory Import

The agent uses `@qwery/agent-factory-sdk`. If you see import errors, make sure:

1. Dependencies are installed: `pnpm install`
2. The package is built: `pnpm --filter agent-factory-sdk build` (if needed)

### Verbose Logging

The agent factory logs to console. You should see logs like:
- `AgentFactory resolved model`
- Model resolution messages

## Quick Test Script

You can also test the agent factory directly:

```bash
node -e "
import('@qwery/agent-factory-sdk').then(({ AgentFactory }) => {
  const factory = new AgentFactory();
  try {
    const model = factory.resolveModel('azure');
    console.log('✓ Model resolved:', !!model);
  } catch (e) {
    console.log('✗ Error:', e.message);
  }
});
"
```

## Summary

The agent integration is complete. To test:

1. ✅ Set environment variables
2. ✅ Build the CLI
3. ✅ Create a datasource
4. ✅ Enter interactive mode
5. ✅ Select datasource with `/use`
6. ✅ Type a natural language query

If the agent responds with SQL and executes it, **it's working!** 🎉

