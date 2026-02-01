import type { ChatMessage, ToolCall } from './state/types.ts';

export function mockLLMResponse(prompt: string): ChatMessage {
  const promptLower = prompt.toLowerCase();
  let content: string;
  let toolCalls: ToolCall[] = [];

  if (promptLower.includes('who are you')) {
    toolCalls = [
      {
        name: 'WebFetch',
        args: 'https://qwery.run',
        output: 'Fetched 2.3KB from qwery.run',
        status: 'success',
      },
    ];
    content =
      "I'm **Qwery**, an AI-powered data assistant. I help you query databases, analyze data, and build dashboards. I support PostgreSQL, MySQL, DuckDB, and many other databases.";
  } else if (promptLower.includes('what can you do')) {
    toolCalls = [
      {
        name: 'Read',
        args: 'README.md',
        output: '# Qwery\n\nAI-powered data platform...',
        status: 'success',
      },
    ];
    content = `I can help you with data tasks:

**Query databases** – Write and execute SQL queries with natural language
**Analyze data** – Explore datasets, find patterns, generate insights
**Build dashboards** – Create visualizations and reports
**Connect sources** – PostgreSQL, MySQL, DuckDB, CSV, Parquet, and more
**Manage projects** – Organize queries, notebooks, and datasources

I work with any SQL database and integrate with your existing workflow.`;
  } else if (promptLower.includes('run') || promptLower.includes('execute')) {
    toolCalls = [
      {
        name: 'bash',
        args: 'psql -c "SELECT COUNT(*) FROM users"',
        output: ` count
-------
  1542
(1 row)`,
        status: 'success',
      },
    ];
    content =
      'Query executed successfully. Found **1,542 users** in the database.';
  } else if (promptLower.includes('create') || promptLower.includes('write')) {
    toolCalls = [
      {
        name: 'write',
        args: 'src/query.sql',
        output: `SELECT u.name, u.email, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id
ORDER BY order_count DESC
LIMIT 10;`,
        status: 'success',
      },
    ];
    content =
      'Created `src/query.sql` with a query to find top users by order count.';
  } else if (promptLower.includes('edit') || promptLower.includes('fix')) {
    toolCalls = [
      {
        name: 'edit',
        args: 'src/config.ts',
        output: `@@ -5,7 +5,7 @@
 export const config = {
   database: {
-    host: 'localhost',
+    host: process.env.DB_HOST || 'localhost',
     port: 5432,
   }
 };`,
        status: 'success',
      },
    ];
    content =
      'Updated `src/config.ts` to use environment variable for database host.';
  } else if (promptLower.includes('error') || promptLower.includes('fail')) {
    toolCalls = [
      {
        name: 'bash',
        args: 'psql -c "SELECT * FROM nonexistent"',
        output:
          'ERROR: relation "nonexistent" does not exist\nLINE 1: SELECT * FROM nonexistent',
        status: 'error',
      },
    ];
    content =
      "The query failed because the table `nonexistent` doesn't exist. Would you like me to list available tables?";
  } else {
    toolCalls = [
      {
        name: 'Read',
        args: '.',
        output: 'Listed 12 files in current directory',
        status: 'success',
      },
    ];
    content = `I understand you're asking about: **${prompt}**

Let me help you with that. This is a mock response for demonstration purposes.`;
  }

  return {
    role: 'assistant',
    content,
    toolCalls,
    model: 'Qwery Engine',
    duration: '2.1s',
    timestamp: Date.now(),
  };
}
