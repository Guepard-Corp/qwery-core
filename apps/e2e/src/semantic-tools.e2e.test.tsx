import { describe, expect, test } from 'bun:test';
import {
  createHashingEmbedder,
  createInProcessOntologyProvider,
  createInProcessSchemaRetriever,
} from '@qwery/adapter-semantic-inprocess';
import { runAgent } from '@qwery/agent-factory-sdk';
import type { AppServices } from '@qwery/cli/services';
import type { Column, Compute, DatasourceMetadata, Logger, ToolEvent } from '@qwery/domain';
import { delay, renderApp, waitForFrame } from './support/harness';
import { makeToolCallModel } from './support/mock-services';
import { captureFrame } from './support/screenshot';

/**
 * End-to-end test of the semantic layer through the REAL agent loop and the
 * REAL in-process semantic adapter (no servers, no embedding model download).
 *
 * Flow exercised: runAgent → buildTools → tool roster → createSearchSchemaTool /
 * createValidateQueryTool → SchemaRetriever / OntologyProvider (hashing embedder,
 * Jaccard+I-SUB ontology). The LLM is mocked to (1) call the tool, then (2) reply,
 * so the whole pipeline runs deterministically.
 */

const silent: Logger = { debug() {}, info() {}, warn() {}, error() {} };

const compute: Compute = {
  runSql: async () => ({ columns: [], rows: [], rowCount: 0, durationMs: 0 }),
  describeSql: async () => ({ columns: [] }),
};

function col(table: string, name: string): Column {
  return {
    id: `${table}.${name}`,
    table_id: 1,
    schema: 'main',
    table,
    name,
    ordinal_position: 1,
    data_type: 'DECIMAL',
    format: 'DECIMAL',
    is_identity: false,
    identity_generation: null,
    is_generated: false,
    is_nullable: true,
    is_updatable: true,
    is_unique: false,
    check: null,
    default_value: null,
    enums: [],
    comment: null,
  };
}

const metadata: DatasourceMetadata = {
  version: '0',
  driver: 'test',
  schemas: [],
  tables: [],
  columns: [col('sales', 'revenue'), col('sales', 'region')],
};

const schemaProvider = {
  listSchemas: async () => [{ datasourceId: '1', datasourceName: 'sales', metadata }],
};

describe('e2e: semantic tools through the real agent loop', () => {
  test('searchSchema retrieves the query-relevant table via the in-process retriever', async () => {
    const events: ToolEvent[] = [];
    const result = await runAgent({
      messages: [{ role: 'user', content: 'where do we keep revenue?' }],
      compute,
      llm: makeToolCallModel('searchSchema', { query: 'revenue' }, 'It lives in sales.revenue.'),
      logger: silent,
      onToolEvent: (e) => events.push(e),
      onToken: () => {},
      disableCompaction: true,
      schemaProvider,
      schemaRetriever: createInProcessSchemaRetriever(createHashingEmbedder()),
      ontologyProvider: createInProcessOntologyProvider(),
    });

    const done = events.find((e) => e.name === 'searchSchema' && e.status === 'done');
    expect(done?.output).toMatchObject({ kind: 'searchSchema', available: true });
    expect((done?.output as { tables: number }).tables).toBeGreaterThan(0);
    expect(result.text).toContain('sales.revenue');
  });

  test('validateQuery flags a hallucinated column via the in-process ontology', async () => {
    const events: ToolEvent[] = [];
    await runAgent({
      messages: [{ role: 'user', content: 'run it' }],
      compute,
      llm: makeToolCallModel('validateQuery', { sql: 'SELECT sales.bad FROM sales' }, 'Fixing the query.'),
      logger: silent,
      onToolEvent: (e) => events.push(e),
      onToken: () => {},
      disableCompaction: true,
      schemaProvider,
      ontologyProvider: createInProcessOntologyProvider(),
    });

    const done = events.find((e) => e.name === 'validateQuery' && e.status === 'done');
    const output = done?.output as { kind: string; valid: boolean; violations: Array<{ entity: string }> };
    expect(output.valid).toBe(false);
    expect(output.violations[0]?.entity).toBe('bad');
  });
});

/** Attached-datasources stub whose `schemas()` exposes the `sales` metadata to the agent. */
const attachedDatasourcesWithSchema: AppServices['attachedDatasources'] = {
  list: () => [],
  get: () => undefined,
  attach: async (ds) => ({ status: 'detached', datasource: ds }),
  detach: async () => undefined,
  test: async () => ({ ok: true }),
  schemas: async () => [{ datasourceId: '1', datasourceName: 'sales', metadata }],
  subscribe: () => () => undefined,
};

describe('e2e: semantic tools through the full TUI', () => {
  test('typing a question drives searchSchema and renders the tool + reply', async () => {
    const { lastFrame, stdin, unmount } = renderApp({
      llm: makeToolCallModel('searchSchema', { query: 'revenue' }, 'It lives in sales.revenue.'),
      attachedDatasources: attachedDatasourcesWithSchema,
    });

    try {
      await waitForFrame(lastFrame, (f) => f.includes('qwery'), { label: 'boot' });

      stdin.write('where do we keep revenue?');
      await delay(50);
      stdin.write('\r');

      const frame = await waitForFrame(lastFrame, (f) => f.includes('sales.revenue'), {
        label: 'searchSchema-tui',
        timeoutMs: 6000,
      });
      captureFrame('searchSchema-tui', frame);
      // The ToolCall row renders the `searchSchema` label, proving the tool ran in-UI.
      expect(frame).toContain('Search');
    } finally {
      unmount();
    }
  });
});
