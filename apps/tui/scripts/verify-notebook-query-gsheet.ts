/**
 * Verifies notebook/query SHOW TABLES returns rows for a gsheet-csv datasource.
 * Run: cd apps/tui && bun run scripts/verify-notebook-query-gsheet.ts
 * Requires server running (e.g. pnpm --filter server dev).
 */
import {
  ensureServerRunning,
  apiBase,
  initWorkspace,
  createConversation,
  createDatasource,
  runNotebookQuery,
} from '../src/server-client.ts';

const GSHEET_URL =
  'https://docs.google.com/spreadsheets/d/1yP2AqgG4cu6xMgT7FdS5JRdIKmfGt3bucJFvD3WJOgg/edit?gid=0#gid=0';

async function main() {
  const root = await ensureServerRunning();
  const api = apiBase(root);

  const { projectId } = await initWorkspace(api, { runtime: 'desktop' });
  if (!projectId) throw new Error('Init did not return projectId');

  const conv = await createConversation(api, 'Verify notebook', 'Hi', {
    projectId,
  });
  const ds = await createDatasource(api, {
    projectId,
    name: 'wayout',
    description: 'Verify notebook query gsheet',
    datasource_provider: 'gsheet-csv',
    datasource_driver: 'gsheet-csv.duckdb',
    datasource_kind: 'embedded',
    config: { sharedLink: GSHEET_URL },
    createdBy: 'verify-script',
  });

  const result = await runNotebookQuery(api, {
    conversationId: conv.id,
    query: 'SHOW TABLES;',
    datasourceId: ds.id,
  });

  if (!result.success) {
    console.error('runNotebookQuery failed:', result.error);
    process.exit(1);
  }
  const rows = result.data?.rows ?? [];
  if (rows.length === 0) {
    console.error('Expected at least 1 row from SHOW TABLES; got 0');
    process.exit(1);
  }
  console.log('SHOW TABLES returned', rows.length, 'row(s):', rows);
  console.log('OK');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
