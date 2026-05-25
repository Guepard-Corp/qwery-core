import { beforeEach, describe, expect, test } from 'bun:test';
import {
  createDatasource,
  createMessage,
  createSession,
  createUsage,
  type ISecretVault,
  MessageRole,
} from '@qwery/domain';
import { createSqlitePersistence, type SqlitePersistence } from './index';

// Minimal vault stub: marks `secret:`-prefixed values as protected and reveals
// them by stripping the prefix. Enough to exercise revealSecrets wiring.
const fakeVault: ISecretVault = {
  async protect(value) {
    return `secret:${value}`;
  },
  async reveal(handle) {
    return handle.replace(/^secret:/, '');
  },
  isProtected(value) {
    return typeof value === 'string' && value.startsWith('secret:');
  },
};

let p: SqlitePersistence;

beforeEach(() => {
  p = createSqlitePersistence({ vault: fakeVault, dbPath: ':memory:' });
});

describe('SqliteSessionRepository', () => {
  test('create / findById / findBySlug / findAll round-trip', async () => {
    const s = createSession({ title: 'Demo', datasources: ['ds-1'] });
    await p.sessionRepo.create(s);

    const byId = await p.sessionRepo.findById(s.id);
    expect(byId?.title).toBe('Demo');
    expect(byId?.datasources).toEqual(['ds-1']);
    expect(byId?.createdAt).toBeInstanceOf(Date);

    expect((await p.sessionRepo.findBySlug(s.slug))?.id).toBe(s.id);
    expect(await p.sessionRepo.findAll()).toHaveLength(1);
  });

  test('findByDatasourceId matches JSON-array membership', async () => {
    await p.sessionRepo.create(createSession({ title: 'A', datasources: ['ds-x'] }));
    await p.sessionRepo.create(createSession({ title: 'B', datasources: ['ds-y'] }));
    const found = await p.sessionRepo.findByDatasourceId('ds-x');
    expect(found).toHaveLength(1);
    expect(found[0]?.title).toBe('A');
  });

  test('delete removes the row', async () => {
    const s = createSession({ title: 'Z' });
    await p.sessionRepo.create(s);
    expect(await p.sessionRepo.delete(s.id)).toBe(true);
    expect(await p.sessionRepo.findById(s.id)).toBeNull();
    expect(await p.sessionRepo.delete(s.id)).toBe(false);
  });
});

describe('SqliteMessageRepository', () => {
  test('persists content/metadata as JSON and paginates backwards', async () => {
    const session = createSession({ title: 'S' });
    await p.sessionRepo.create(session);
    for (let i = 0; i < 3; i++) {
      const m = createMessage({
        sessionId: session.id,
        role: MessageRole.USER,
        content: { parts: [{ type: 'text', text: `m${i}` }] },
      });
      // Force distinct, ordered timestamps for deterministic pagination.
      m.createdAt = new Date(Date.UTC(2026, 0, 1, 0, 0, i));
      await p.messageRepo.create(m);
    }

    const all = await p.messageRepo.findBySessionId(session.id);
    expect(all).toHaveLength(3);
    expect(all[0]?.content.parts?.[0]).toMatchObject({ type: 'text', text: 'm0' });

    const firstPage = await p.messageRepo.findBySessionIdPaginated(session.id, {
      cursor: null,
      limit: 2,
      direction: 'before',
    });
    expect(firstPage.messages).toHaveLength(2);
    expect(firstPage.hasMore).toBe(true);

    const nextPage = await p.messageRepo.findBySessionIdPaginated(session.id, {
      cursor: firstPage.nextCursor,
      limit: 2,
      direction: 'before',
    });
    expect(nextPage.messages).toHaveLength(1);
    expect(nextPage.hasMore).toBe(false);
  });
});

describe('SqliteUsageRepository', () => {
  test('round-trips numeric columns and lists by session', async () => {
    const sessionUuid = '00000000-0000-4000-8000-000000000000';
    const u = createUsage({
      sessionId: sessionUuid,
      model: 'openai/gpt-4o',
      inputTokens: 10,
      outputTokens: 5,
      totalTokens: 15,
      reasoningTokens: 0,
      cachedInputTokens: 0,
      cacheWriteTokens: 0,
      costUSD: 0.0021,
      inputCostUSD: 0.001,
      outputCostUSD: 0.0011,
      durationMs: 1200,
      contextSize: 15,
    });
    await p.usageRepo.create(u);
    const back = await p.usageRepo.findById(u.id);
    expect(back?.inputTokens).toBe(10);
    expect(back?.costUSD).toBeCloseTo(0.0021);
    expect(await p.usageRepo.findBySessionId(sessionUuid)).toHaveLength(1);
  });
});

describe('SqliteDatasourceRepository', () => {
  test('round-trips config and reveals protected secrets via the vault', async () => {
    const ds = createDatasource({
      name: 'PG',
      datasource_provider: 'postgresql',
      datasource_driver: 'pg',
      config: { host: 'localhost', password: 'secret:hunter2' },
    });
    await p.datasourceRepo.create(ds);

    const back = await p.datasourceRepo.findById(ds.id);
    expect(back).not.toBeNull();
    expect(back?.config).toMatchObject({ host: 'localhost', password: 'secret:hunter2' });

    const revealed = await p.datasourceRepo.revealSecrets((back?.config ?? {}) as Record<string, unknown>);
    expect(revealed).toMatchObject({ host: 'localhost', password: 'hunter2' });
  });

  test('findById returns null for unknown id', async () => {
    expect(await p.datasourceRepo.findById('missing')).toBeNull();
  });

  test('findBySlug returns null when no row matches', async () => {
    expect(await p.datasourceRepo.findBySlug('nope')).toBeNull();
  });

  test('findBySlug finds by slug after create', async () => {
    const ds = createDatasource({
      name: 'X',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    await p.datasourceRepo.create(ds);
    const found = await p.datasourceRepo.findBySlug(ds.slug);
    expect(found?.id).toBe(ds.id);
  });

  test('findAll honors limit + offset and orders newest first', async () => {
    const oldest = createDatasource({
      name: 'old',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    oldest.updatedAt = new Date(Date.UTC(2026, 0, 1));
    await p.datasourceRepo.create(oldest);

    const newest = createDatasource({
      name: 'new',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    newest.updatedAt = new Date(Date.UTC(2026, 0, 2));
    await p.datasourceRepo.create(newest);

    const all = await p.datasourceRepo.findAll();
    expect(all[0]?.name).toBe('new');

    const limited = await p.datasourceRepo.findAll({ limit: 1, offset: 1 });
    expect(limited).toHaveLength(1);
    expect(limited[0]?.name).toBe('old');
  });

  test('update mutates the existing row in place', async () => {
    const ds = createDatasource({
      name: 'orig',
      datasource_provider: 'csv',
      datasource_driver: 'duckdb',
      config: {},
    });
    await p.datasourceRepo.create(ds);
    const updated = { ...ds, name: 'renamed', updatedAt: new Date() };
    await p.datasourceRepo.update(updated);
    expect((await p.datasourceRepo.findById(ds.id))?.name).toBe('renamed');
    expect(await p.datasourceRepo.findAll()).toHaveLength(1);
  });

  test('delete returns false for unknown id', async () => {
    expect(await p.datasourceRepo.delete('missing')).toBe(false);
  });

  test('revealSecrets leaves non-protected fields untouched', async () => {
    const revealed = await p.datasourceRepo.revealSecrets({
      host: 'h',
      port: 5432,
      bool: true,
    });
    expect(revealed).toEqual({ host: 'h', port: 5432, bool: true });
  });
});

describe('SqliteMessageRepository — extra paths', () => {
  test('findById returns null for unknown id', async () => {
    expect(await p.messageRepo.findById('missing')).toBeNull();
  });

  test('findById round-trips a stored message', async () => {
    const s = createSession({ title: 'X' });
    await p.sessionRepo.create(s);
    const m = createMessage({
      sessionId: s.id,
      role: MessageRole.USER,
      content: { parts: [{ type: 'text', text: 'hi' }] },
    });
    await p.messageRepo.create(m);
    expect((await p.messageRepo.findById(m.id))?.id).toBe(m.id);
  });

  test('delete removes the row', async () => {
    const s = createSession({ title: 'X' });
    await p.sessionRepo.create(s);
    const m = createMessage({
      sessionId: s.id,
      role: MessageRole.USER,
      content: { parts: [] },
    });
    await p.messageRepo.create(m);
    expect(await p.messageRepo.delete(m.id)).toBe(true);
    expect(await p.messageRepo.findById(m.id)).toBeNull();
  });
});

describe('SqliteUsageRepository — extra paths', () => {
  test('findById returns null for unknown id', async () => {
    expect(await p.usageRepo.findById('missing')).toBeNull();
  });

  test('findAll returns every stored entry', async () => {
    const sid = '00000000-0000-4000-8000-000000000001';
    for (let i = 0; i < 3; i++) {
      await p.usageRepo.create(
        createUsage({
          sessionId: sid,
          model: 'm',
          inputTokens: i,
          outputTokens: i,
          totalTokens: i * 2,
        }),
      );
    }
    expect(await p.usageRepo.findAll()).toHaveLength(3);
  });

  test('delete removes the row', async () => {
    const u = createUsage({ model: 'm' });
    await p.usageRepo.create(u);
    expect(await p.usageRepo.delete(u.id)).toBe(true);
    expect(await p.usageRepo.findById(u.id)).toBeNull();
  });
});
