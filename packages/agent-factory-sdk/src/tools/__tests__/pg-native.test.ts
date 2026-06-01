import { describe, expect, test } from 'bun:test';
import type { Compute, Datasource, QueryResult } from '@qwery/domain';
import { createSourceAwareCompute, type SourcePostgresExecutors } from '../pg-native';

const DUCK_RESULT: QueryResult = {
  columns: ['engine'],
  rows: [{ engine: 'duck' }],
  rowCount: 1,
  durationMs: 0,
};
const PG_RESULT: QueryResult = { columns: ['engine'], rows: [{ engine: 'pg' }], rowCount: 1, durationMs: 0 };

function fallback(): Compute {
  return {
    runSql: async () => DUCK_RESULT,
    describeSql: async () => ({ columns: [{ name: 'engine', type: 'duck' }] }),
  };
}

function datasource(provider: string): Datasource {
  return {
    id: '00000000-0000-0000-0000-000000000000',
    name: 'src',
    description: '',
    slug: 'src',
    datasource_provider: provider,
    datasource_driver: provider,
    config: { host: 'db.example.com', port: 5432, database: 'app' },
    createdAt: new Date(0),
    updatedAt: new Date(0),
  } as Datasource;
}

function recordingExecutors(): { executors: SourcePostgresExecutors; urls: string[] } {
  const urls: string[] = [];
  return {
    urls,
    executors: {
      runSql: async (url) => {
        urls.push(url);
        return PG_RESULT;
      },
      describeSql: async (url) => {
        urls.push(url);
        return { columns: [{ name: 'engine', type: 'text' }] };
      },
    },
  };
}

describe('createSourceAwareCompute', () => {
  test('routes to native PostgreSQL when a postgres datasource is attached', async () => {
    const { executors, urls } = recordingExecutors();
    const compute = createSourceAwareCompute(
      fallback(),
      { getAttachedDatasource: async () => datasource('postgres') },
      executors,
    );
    expect((await compute.runSql('SELECT 1')).rows[0]?.engine).toBe('pg');
    expect((await compute.describeSql('SELECT 1')).columns[0]?.type).toBe('text');
    expect(urls.every((u) => u.includes('db.example.com'))).toBe(true);
    expect(urls).toHaveLength(2);
  });

  test('accepts the "postgresql" provider spelling', async () => {
    const { executors, urls } = recordingExecutors();
    const compute = createSourceAwareCompute(
      fallback(),
      { getAttachedDatasource: async () => datasource('postgresql') },
      executors,
    );
    expect((await compute.runSql('SELECT 1')).rows[0]?.engine).toBe('pg');
    expect(urls).toHaveLength(1);
  });

  test('falls back to DuckDB for a non-postgres datasource', async () => {
    const { executors, urls } = recordingExecutors();
    const compute = createSourceAwareCompute(
      fallback(),
      { getAttachedDatasource: async () => datasource('csv') },
      executors,
    );
    expect((await compute.runSql('SELECT 1')).rows[0]?.engine).toBe('duck');
    expect(urls).toHaveLength(0);
  });

  test('falls back to DuckDB when no datasource is attached', async () => {
    const { executors, urls } = recordingExecutors();
    const compute = createSourceAwareCompute(
      fallback(),
      { getAttachedDatasource: async () => null },
      executors,
    );
    expect((await compute.describeSql('SELECT 1')).columns[0]?.type).toBe('duck');
    expect(urls).toHaveLength(0);
  });
});
