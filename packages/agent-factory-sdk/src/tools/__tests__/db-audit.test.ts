import { describe, expect, test } from 'bun:test';
import type { Compute } from '@qwery/domain';
import {
  createCompareQueryRewriteTool,
  createDetectDbEngineTool,
  createGetTopSlowQueriesTool,
} from '../db-audit';
import type { Track } from '../track';

const passThroughTrack: Track = async (_name, _input, fn) => (await fn()).llm;
const opts = { toolCallId: 't', messages: [] };
// biome-ignore lint/suspicious/noExplicitAny: ai SDK tool.execute options typing is not under test
const run = (t: any, input: unknown) => t.execute(input, opts);

function fakeCompute(queries: string[] = []): Compute {
  return {
    async runSql(sql) {
      queries.push(sql);
      if (sql.includes('information_schema.tables')) {
        const tableName = sql.match(/table_name = '([^']+)'/)?.[1] ?? 'unknown';
        const schemaName = sql.match(/table_schema = '([^']+)'/)?.[1] ?? 'public';
        return {
          columns: ['table_catalog', 'table_schema', 'table_name'],
          rows: [{ table_catalog: 'pg_attached', table_schema: schemaName, table_name: tableName }],
          rowCount: 1,
          durationMs: 1,
        };
      }
      return {
        columns: ['value'],
        rows: [{ value: 'PostgreSQL 16' }],
        rowCount: 1,
        durationMs: 1,
      };
    },
    async describeSql() {
      return { columns: [] };
    },
  };
}

describe('db audit tools', () => {
  test('detectDbEngine queries version metadata', async () => {
    const queries: string[] = [];
    const tool = createDetectDbEngineTool({ compute: fakeCompute(queries), track: passThroughTrack });

    const result = await run(tool, {});

    expect(result.ok).toBe(true);
    expect(result.summary).toContain('Detected');
    expect(queries[1]).toContain('"pg_attached"."pg_catalog"."pg_settings"');
  });

  test('compareQueryRewrite explains both read-only queries', async () => {
    const queries: string[] = [];
    const tool = createCompareQueryRewriteTool({ compute: fakeCompute(queries), track: passThroughTrack });

    const result = await run(tool, {
      originalSql: 'SELECT count(*) FROM orders',
      rewrittenSql: 'SELECT count(*) FROM orders WHERE created_at IS NOT NULL',
    });

    expect(result.ok).toBe(true);
    expect(queries).toHaveLength(2);
    expect(queries[0]).toStartWith('EXPLAIN');
    expect(queries[1]).toStartWith('EXPLAIN');
  });

  test('compareQueryRewrite rejects write-capable SQL before compute runs', async () => {
    const queries: string[] = [];
    const tool = createCompareQueryRewriteTool({ compute: fakeCompute(queries), track: passThroughTrack });

    await expect(
      run(tool, {
        originalSql: 'SELECT count(*) FROM orders',
        rewrittenSql: 'DELETE FROM orders',
      }),
    ).rejects.toThrow('Only read-only SQL statements are allowed in audit tools.');
    expect(queries).toHaveLength(0);
  });

  test('detectDbEngine qualifies attached PostgreSQL catalog namespace', async () => {
    const queries: string[] = [];
    const tool = createDetectDbEngineTool({ compute: fakeCompute(queries), track: passThroughTrack });

    await run(tool, {});

    expect(queries[0]).toContain('information_schema.tables');
    expect(queries[1]).toContain('FROM "pg_attached"."pg_catalog"."pg_settings"');
  });

  test('getTopSlowQueries uses SQL that is portable through DuckDB federation', async () => {
    const queries: string[] = [];
    const tool = createGetTopSlowQueriesTool({ compute: fakeCompute(queries), track: passThroughTrack });

    await run(tool, { limit: 5 });

    expect(queries[1]).toContain("LOWER(TRIM(query)) LIKE 'select%'");
    expect(queries[1]).not.toContain('~*');
  });
});
