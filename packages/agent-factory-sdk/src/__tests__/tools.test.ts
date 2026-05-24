import { afterAll, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { Compute, QueryResult, QuerySchema, ToolEvent } from '@qwery/domain';
import { buildTools } from '../tools';

interface ToolExecHandle {
  execute?: (input: unknown, ctx?: unknown) => Promise<unknown>;
}

async function exec(tool: ToolExecHandle, input: unknown) {
  return tool.execute?.(input, { toolCallId: 't', messages: [] });
}

function fakeCompute(over: Partial<Compute> = {}): Compute {
  return {
    runSql: async () => ({ columns: [], rows: [], rowCount: 0 }) as unknown as QueryResult,
    describeSql: async () => ({ columns: [] }) as unknown as QuerySchema,
    ...over,
  };
}

const fixtureDir = path.join(process.cwd(), '.test-tools-fixtures');

beforeEach(() => {
  if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
  mkdirSync(fixtureDir, { recursive: true });
});

afterAll(() => {
  if (existsSync(fixtureDir)) rmSync(fixtureDir, { recursive: true, force: true });
});

describe('buildTools — runQuery', () => {
  test('rejects non-aggregate SQL and returns {ok:false}', async () => {
    const events: ToolEvent[] = [];
    const tools = buildTools({ compute: fakeCompute(), onEvent: (e) => events.push(e) });
    const r = (await exec(tools.runQuery, { sql: 'SELECT * FROM t' })) as { ok: boolean };
    expect(r.ok).toBe(false);
    expect(events[1]?.status).toBe('error');
  });

  test('rejects when the query returns more than one row', async () => {
    const compute = fakeCompute({
      runSql: async () =>
        ({ columns: ['n'], rows: [{ n: 1 }, { n: 2 }], rowCount: 2 }) as unknown as QueryResult,
    });
    const tools = buildTools({ compute, onEvent: () => {} });
    const r = (await exec(tools.runQuery, { sql: 'SELECT COUNT(*) FROM t' })) as {
      ok: boolean;
      error: string;
    };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/exactly 1 row/);
  });

  test('returns the scalar row on success', async () => {
    const compute = fakeCompute({
      runSql: async () =>
        ({ columns: ['total'], rows: [{ total: 42 }], rowCount: 1 }) as unknown as QueryResult,
    });
    const tools = buildTools({ compute, onEvent: () => {} });
    const r = (await exec(tools.runQuery, { sql: 'SELECT COUNT(*) AS total FROM t' })) as {
      ok: boolean;
      row: { total: number };
    };
    expect(r.ok).toBe(true);
    expect(r.row.total).toBe(42);
  });
});

describe('buildTools — describeQuery', () => {
  test('returns columns from compute.describeSql', async () => {
    const compute = fakeCompute({
      describeSql: async () => ({ columns: ['a', 'b'] }) as unknown as QuerySchema,
    });
    const tools = buildTools({ compute, onEvent: () => {} });
    const r = (await exec(tools.describeQuery, { sql: 'SELECT a, b FROM t' })) as {
      ok: boolean;
      columns: string[];
    };
    expect(r.ok).toBe(true);
    expect(r.columns).toEqual(['a', 'b']);
  });
});

describe('buildTools — present', () => {
  test('returns only rowCount to the LLM (privacy)', async () => {
    const compute = fakeCompute({
      runSql: async () =>
        ({
          columns: ['name'],
          rows: [{ name: 'a' }, { name: 'b' }],
          rowCount: 2,
        }) as unknown as QueryResult,
    });
    let presented: ToolEvent | undefined;
    const tools = buildTools({
      compute,
      onEvent: (e) => {
        if (e.status === 'done' && e.name === 'present') presented = e;
      },
    });
    const r = (await exec(tools.present, {
      sql: 'SELECT name FROM t',
      template: '{{#rows}}- {{name}}\n{{/rows}}',
    })) as { ok: boolean; rowCount: number };
    expect(r).toEqual({ ok: true, rowCount: 2 });
    // The rendered output is in the UI event, not in the LLM payload.
    expect(presented?.output?.kind).toBe('present');
  });

  test('rejects templates that reference unknown columns', async () => {
    const compute = fakeCompute({
      runSql: async () =>
        ({ columns: ['name'], rows: [{ name: 'a' }], rowCount: 1 }) as unknown as QueryResult,
    });
    const tools = buildTools({ compute, onEvent: () => {} });
    const r = (await exec(tools.present, {
      sql: 'SELECT name FROM t',
      template: '{{nope}}',
    })) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/unknown columns/);
  });
});

describe('buildTools — bash', () => {
  test('runs a command and returns stdout/exitCode', async () => {
    const tools = buildTools({ compute: fakeCompute(), onEvent: () => {} });
    const r = (await exec(tools.bash, { command: "printf 'hi'" })) as {
      ok: boolean;
      stdout: string;
      exitCode: number;
    };
    expect(r.ok).toBe(true);
    expect(r.stdout).toBe('hi');
    expect(r.exitCode).toBe(0);
  });
});

describe('buildTools — read / write / edit', () => {
  test('write then read round-trip inside the workspace', async () => {
    const tools = buildTools({ compute: fakeCompute(), onEvent: () => {} });
    const p = path.join(fixtureDir, 'a.txt');
    await exec(tools.write, { path: p, content: 'hello' });
    const r = (await exec(tools.read, { path: p })) as { ok: boolean; content: string };
    expect(r.ok).toBe(true);
    expect(r.content).toBe('hello');
  });

  test('edit applies a unique replacement', async () => {
    const tools = buildTools({ compute: fakeCompute(), onEvent: () => {} });
    const p = path.join(fixtureDir, 'e.txt');
    writeFileSync(p, 'foo bar baz');
    const r = (await exec(tools.edit, {
      path: p,
      edits: [{ oldText: 'bar', newText: 'BAR' }],
    })) as { ok: boolean; appliedEdits: number };
    expect(r.ok).toBe(true);
    expect(r.appliedEdits).toBe(1);
  });

  test('read refuses paths outside the workspace', async () => {
    const tools = buildTools({ compute: fakeCompute(), onEvent: () => {} });
    const r = (await exec(tools.read, { path: '/etc/passwd' })) as { ok: boolean };
    expect(r.ok).toBe(false);
  });
});
