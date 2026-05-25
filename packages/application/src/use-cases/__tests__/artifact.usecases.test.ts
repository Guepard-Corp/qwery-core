import { describe, expect, test } from 'bun:test';
import type { Compute, QueryResult, ToolEvent } from '@qwery/domain';
import {
  createQueryArtifact,
  deleteArtifact,
  getArtifact,
  listArtifacts,
  listArtifactsByDatasource,
  listArtifactsByTag,
  listQueryArtifacts,
  promoteToolCallToArtifact,
  runQueryArtifact,
  searchArtifacts,
  updateQueryArtifact,
} from '../artifact';
import { InMemoryArtifactRepo } from './repo-mocks';

function seed() {
  return { artifactRepo: new InMemoryArtifactRepo() };
}

function fakeCompute(rowCount = 5, durationMs = 10): Compute {
  const result: QueryResult = {
    rowCount,
    durationMs,
    columns: [],
    rows: [],
  } as unknown as QueryResult;
  return {
    runSql: async () => result,
    describeSql: async () => ({ columns: [] }) as never,
  };
}

describe('createQueryArtifact / get / list', () => {
  test('persists a new artifact', async () => {
    const deps = seed();
    const a = await createQueryArtifact(deps, { title: 't', sql: 'SELECT 1' });
    expect(await getArtifact(deps, a.id)).toEqual(a);
  });

  test('listArtifacts returns all', async () => {
    const deps = seed();
    await createQueryArtifact(deps, { title: 'a', sql: 'SELECT 1' });
    await createQueryArtifact(deps, { title: 'b', sql: 'SELECT 2' });
    expect(await listArtifacts(deps)).toHaveLength(2);
  });

  test('listQueryArtifacts returns the query-typed list', async () => {
    const deps = seed();
    await createQueryArtifact(deps, { title: 'a', sql: 'SELECT 1' });
    const list = await listQueryArtifacts(deps);
    expect(list[0]?.type).toBe('query');
  });

  test('listArtifactsByTag and ByDatasource filter correctly', async () => {
    const deps = seed();
    await createQueryArtifact(deps, {
      title: 'a',
      sql: 'SELECT 1',
      tags: ['retention'],
      datasourceIds: ['ds_1'],
    });
    await createQueryArtifact(deps, { title: 'b', sql: 'SELECT 2', tags: ['cohort'] });
    expect(await listArtifactsByTag(deps, 'retention')).toHaveLength(1);
    expect(await listArtifactsByDatasource(deps, 'ds_1')).toHaveLength(1);
  });
});

describe('updateQueryArtifact', () => {
  test('throws when not found', async () => {
    await expect(updateQueryArtifact(seed(), 'missing', { sql: 'x' })).rejects.toThrow(/not found/);
  });

  test('updates sql', async () => {
    const deps = seed();
    const a = await createQueryArtifact(deps, { title: 't', sql: 'SELECT 1' });
    const next = await updateQueryArtifact(deps, a.id, { sql: 'SELECT 2' });
    expect(next.sql).toBe('SELECT 2');
  });
});

describe('deleteArtifact', () => {
  test('removes the entity', async () => {
    const deps = seed();
    const a = await createQueryArtifact(deps, { title: 't', sql: 'SELECT 1' });
    expect(await deleteArtifact(deps, a.id)).toBe(true);
    expect(await getArtifact(deps, a.id)).toBeNull();
  });
});

describe('runQueryArtifact', () => {
  test('runs the SQL via Compute and records lastResultMeta', async () => {
    const aRepo = seed();
    const a = await createQueryArtifact(aRepo, { title: 't', sql: 'SELECT 1' });
    const deps = { ...aRepo, compute: fakeCompute(42, 7) };
    const out = await runQueryArtifact(deps, a.id);
    expect(out.result.rowCount).toBe(42);
    expect(out.artifact.lastResultMeta?.rowCount).toBe(42);
    expect(out.artifact.lastResultMeta?.durationMs).toBe(7);
  });

  test('throws when artifact is missing', async () => {
    const deps = { ...seed(), compute: fakeCompute() };
    await expect(runQueryArtifact(deps, 'missing')).rejects.toThrow(/not found/);
  });
});

describe('searchArtifacts', () => {
  test('keyword search matches by title and tag and sql', async () => {
    const deps = seed();
    await createQueryArtifact(deps, { title: 'top customers', sql: 'SELECT 1' });
    await createQueryArtifact(deps, {
      title: 'churn',
      sql: 'SELECT 2',
      tags: ['retention'],
    });
    expect(await searchArtifacts(deps, { query: 'customers' })).toHaveLength(1);
    expect(await searchArtifacts(deps, { query: 'retention' })).toHaveLength(1);
  });

  test('limit caps result count', async () => {
    const deps = seed();
    for (let i = 0; i < 5; i++) {
      await createQueryArtifact(deps, { title: `x${i}`, sql: 'SELECT 1' });
    }
    const r = await searchArtifacts(deps, { query: 'x', limit: 2 });
    expect(r).toHaveLength(2);
  });
});

describe('promoteToolCallToArtifact', () => {
  function event(overrides: Partial<ToolEvent> = {}): ToolEvent {
    return {
      id: 't_1',
      name: 'runQuery',
      startedAt: 0,
      endedAt: 1,
      status: 'done',
      input: {},
      output: {
        kind: 'runQuery',
        sql: 'SELECT COUNT(*) FROM t',
        row: {},
        result: { rowCount: 1 } as never,
      },
      ...overrides,
    };
  }

  test('promotes a completed runQuery to a QueryArtifact', async () => {
    const deps = seed();
    const a = await promoteToolCallToArtifact(deps, {
      toolEvent: event(),
      title: 'Count rows',
    });
    expect(a.sql).toBe('SELECT COUNT(*) FROM t');
    expect(a.title).toBe('Count rows');
  });

  test('rejects when tool call is not done', async () => {
    await expect(
      promoteToolCallToArtifact(seed(), {
        toolEvent: event({ status: 'running', output: undefined }),
        title: 't',
      }),
    ).rejects.toThrow();
  });

  test('rejects when the tool call has no SQL', async () => {
    const ev = event({
      name: 'read',
      output: { kind: 'read', path: 'x', bytes: 0, truncated: false, preview: '' },
    });
    await expect(promoteToolCallToArtifact(seed(), { toolEvent: ev, title: 't' })).rejects.toThrow(/no SQL/);
  });

  test('rejects when the tool call ended in error', async () => {
    const ev = event({ output: { kind: 'error', message: 'boom' } });
    await expect(promoteToolCallToArtifact(seed(), { toolEvent: ev, title: 't' })).rejects.toThrow();
  });
});
