import { describe, expect, test } from 'bun:test';
import type { Datasource, IDatasourceRepository, IUsageRepository, Usage } from '@qwery/domain';
import { buildToolRegistry, makeRegistryContext, type RegistryAttachState } from '../tool-registry';

interface ToolExecHandle {
  execute?: (input: unknown, ctx?: unknown) => Promise<unknown>;
}
async function exec(tool: ToolExecHandle, input: unknown = {}) {
  return tool.execute?.(input, { toolCallId: 't', messages: [] });
}

function fakeDatasource(over: Partial<Datasource> = {}): Datasource {
  return {
    id: 'ds_1',
    slug: 'ds1',
    name: 'sales',
    description: '',
    datasource_provider: 'postgres',
    datasource_driver: 'duckdb-attach',
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  };
}

function fakeDatasourceRepo(items: Datasource[]): IDatasourceRepository {
  return {
    findAll: async () => items,
    findById: async (id) => items.find((d) => d.id === id) ?? null,
    findBySlug: async (slug) => items.find((d) => d.slug === slug) ?? null,
    create: async (e) => e,
    update: async (e) => e,
    delete: async () => true,
    shortenId: (id) => id.slice(0, 4),
  } as IDatasourceRepository;
}

function fakeUsageRepo(items: Usage[]): IUsageRepository {
  return {
    findAll: async () => items,
    findById: async () => null,
    findBySlug: async () => null,
    findBySessionId: async (sid: string) => items.filter((u) => u.sessionId === sid),
    create: async (e: Usage) => e,
    update: async (e: Usage) => e,
    delete: async () => true,
    shortenId: (id: string) => id.slice(0, 4),
  } as unknown as IUsageRepository;
}

const baseCore = [
  { name: 'schema', description: 'schema introspection' },
  { name: 'runQuery', description: 'aggregate-only SQL' },
];

describe('buildToolRegistry — registration', () => {
  test('registers no deferred tools when no optional deps are provided', () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry({}, baseCore, ctx);
    expect(reg.deferred).toHaveLength(0);
  });

  test('datasourceList is registered when datasourceRepo is provided', async () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry({ datasourceRepo: fakeDatasourceRepo([fakeDatasource()]) }, baseCore, ctx);
    expect(reg.deferred.some((t) => t.name === 'datasourceList')).toBe(true);
    const list = reg.deferred.find((t) => t.name === 'datasourceList')!;
    const r = (await exec(list.tool as unknown as ToolExecHandle)) as {
      ok: boolean;
      datasources: { id: string; attached: boolean }[];
    };
    expect(r.ok).toBe(true);
    expect(r.datasources[0]?.id).toBe('ds_1');
  });

  test('attach/detach/test tools surface their respective deps', async () => {
    const ctx = makeRegistryContext();
    let attached = false;
    const reg = buildToolRegistry(
      {
        attachDatasource: async (): Promise<RegistryAttachState> => {
          attached = true;
          return { status: 'attached', tables: [{ path: 'a', columns: [] }] };
        },
        detachDatasource: async () => {
          attached = false;
        },
        testDatasource: async () => ({ ok: true }),
      },
      baseCore,
      ctx,
    );
    expect(reg.deferred.map((t) => t.name).sort()).toEqual([
      'datasourceAttach',
      'datasourceDetach',
      'datasourceTest',
    ]);
    const a = reg.deferred.find((t) => t.name === 'datasourceAttach')!;
    await exec(a.tool as unknown as ToolExecHandle, { id: 'ds_1' });
    expect(attached).toBe(true);
    const d = reg.deferred.find((t) => t.name === 'datasourceDetach')!;
    await exec(d.tool as unknown as ToolExecHandle, { id: 'ds_1' });
    expect(attached).toBe(false);
  });

  test('usageList computes totals across entries', async () => {
    const ctx = makeRegistryContext();
    const usage: Usage[] = [
      {
        id: 'u1',
        model: 'm',
        inputTokens: 10,
        outputTokens: 5,
        totalTokens: 15,
        reasoningTokens: 0,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        costUSD: 0.5,
        inputCostUSD: 0,
        outputCostUSD: 0,
        durationMs: 0,
        contextSize: 0,
        timestamp: new Date(),
      },
      {
        id: 'u2',
        model: 'm',
        inputTokens: 20,
        outputTokens: 10,
        totalTokens: 30,
        reasoningTokens: 0,
        cachedInputTokens: 0,
        cacheWriteTokens: 0,
        costUSD: 1.5,
        inputCostUSD: 0,
        outputCostUSD: 0,
        durationMs: 0,
        contextSize: 0,
        timestamp: new Date(),
      },
    ];
    const reg = buildToolRegistry({ usageRepo: fakeUsageRepo(usage) }, baseCore, ctx);
    const ul = reg.deferred.find((t) => t.name === 'usageList')!;
    const r = (await exec(ul.tool as unknown as ToolExecHandle, { limit: 50 })) as {
      totals: { inputTokens: number; outputTokens: number; costUSD: number };
    };
    expect(r.totals).toEqual({ inputTokens: 30, outputTokens: 15, costUSD: 2.0 });
  });
});

describe('navigators', () => {
  test('listTools returns active + deferred descriptors', async () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry({ datasourceRepo: fakeDatasourceRepo([]) }, baseCore, ctx);
    const r = (await exec(reg.navigators.listTools as unknown as ToolExecHandle)) as {
      active: typeof baseCore;
      deferred: Array<{ name: string }>;
    };
    expect(r.active).toEqual(baseCore);
    expect(r.deferred.find((t) => t.name === 'datasourceList')).toBeTruthy();
  });

  test('searchTools matches by free text', async () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry({ datasourceRepo: fakeDatasourceRepo([]) }, baseCore, ctx);
    const r = (await exec(reg.navigators.searchTools as unknown as ToolExecHandle, {
      query: 'datasource list',
    })) as { hits: Array<{ name: string }> };
    expect(r.hits.find((t) => t.name === 'datasourceList')).toBeTruthy();
  });

  test('loadTool activates a deferred tool and is idempotent', async () => {
    const ctx = makeRegistryContext();
    let lastChange: string[] | undefined;
    const reg = buildToolRegistry({ datasourceRepo: fakeDatasourceRepo([]) }, baseCore, {
      ...ctx,
      onLoadedToolsChange: (names) => (lastChange = names),
    });
    const first = (await exec(reg.navigators.loadTool as unknown as ToolExecHandle, {
      name: 'datasourceList',
    })) as { ok: boolean; alreadyLoaded: boolean };
    expect(first.ok).toBe(true);
    expect(first.alreadyLoaded).toBe(false);
    expect(lastChange).toEqual(['datasourceList']);
    const second = (await exec(reg.navigators.loadTool as unknown as ToolExecHandle, {
      name: 'datasourceList',
    })) as { ok: boolean; alreadyLoaded: boolean };
    expect(second.alreadyLoaded).toBe(true);
  });

  test('loadTool rejects an unknown tool name', async () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry({}, baseCore, ctx);
    const r = (await exec(reg.navigators.loadTool as unknown as ToolExecHandle, {
      name: 'nope',
    })) as { ok: boolean; error: string };
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Unknown tool/);
  });
});

describe('makeRegistryContext', () => {
  test('starts with an empty loaded set when nothing is passed', () => {
    expect(makeRegistryContext().loadedTools.size).toBe(0);
  });

  test('honours an initial iterable of pre-loaded tool names', () => {
    const ctx = makeRegistryContext(['a', 'b']);
    expect([...ctx.loadedTools].sort()).toEqual(['a', 'b']);
  });
});

describe('skill tools', () => {
  test('skillList lists from deps.listSkills', async () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry(
      {
        listSkills: async () => [{ name: 's1', description: 'd', path: '/x' }],
      },
      baseCore,
      ctx,
    );
    const list = reg.deferred.find((t) => t.name === 'skillList')!;
    const r = (await exec(list.tool as unknown as ToolExecHandle)) as {
      ok: boolean;
      skills: Array<{ name: string }>;
    };
    expect(r.ok).toBe(true);
    expect(r.skills[0]?.name).toBe('s1');
  });

  test('skillRead returns content or not-found', async () => {
    const ctx = makeRegistryContext();
    const reg = buildToolRegistry(
      {
        readSkill: async (name) => (name === 'known' ? { name, content: 'body', path: '/x' } : null),
      },
      baseCore,
      ctx,
    );
    const read = reg.deferred.find((t) => t.name === 'skillRead')!;
    const ok = (await exec(read.tool as unknown as ToolExecHandle, { name: 'known' })) as {
      ok: boolean;
    };
    expect(ok.ok).toBe(true);
    const ko = (await exec(read.tool as unknown as ToolExecHandle, { name: 'missing' })) as {
      ok: boolean;
      error: string;
    };
    expect(ko.ok).toBe(false);
    expect(ko.error).toMatch(/not found/);
  });
});

describe('gfsStatus tool', () => {
  test('not registered without a branching dep', () => {
    const reg = buildToolRegistry({}, baseCore, makeRegistryContext());
    expect(reg.deferred.some((t) => t.name === 'gfsStatus')).toBe(false);
  });

  test('reports status when GFS is available', async () => {
    const branching = {
      isAvailable: async () => true,
      version: async () => '0.1.13',
      status: async () => ({
        currentBranch: 'main',
        head: 'abc123',
        provider: 'postgres',
        providerVersion: '16',
        containerStatus: 'running',
        containerRunning: true,
        connectionString: 'postgres://secret@localhost/db',
      }),
    } as unknown as Parameters<typeof buildToolRegistry>[0]['branching'];

    const reg = buildToolRegistry({ branching }, baseCore, makeRegistryContext());
    const gfs = reg.deferred.find((t) => t.name === 'gfsStatus')!;
    const r = (await exec(gfs.tool as unknown as ToolExecHandle)) as Record<string, unknown>;
    expect(r.ok).toBe(true);
    expect(r.available).toBe(true);
    expect(r.version).toBe('0.1.13');
    expect(r.currentBranch).toBe('main');
    // Privacy: the connection string is never surfaced to the LLM.
    expect(JSON.stringify(r)).not.toContain('secret');
  });

  test('reports unavailable with an install hint', async () => {
    const branching = {
      isAvailable: async () => false,
      version: async () => undefined,
      status: async () => {
        throw new Error('should not be called');
      },
    } as unknown as Parameters<typeof buildToolRegistry>[0]['branching'];

    const reg = buildToolRegistry({ branching }, baseCore, makeRegistryContext());
    const gfs = reg.deferred.find((t) => t.name === 'gfsStatus')!;
    const r = (await exec(gfs.tool as unknown as ToolExecHandle)) as Record<string, unknown>;
    expect(r.available).toBe(false);
    expect(String(r.hint)).toMatch(/install/i);
  });

  test('handles an initialized-less repo gracefully', async () => {
    const branching = {
      isAvailable: async () => true,
      version: async () => '0.1.13',
      status: async () => {
        throw new Error('not a gfs repository');
      },
    } as unknown as Parameters<typeof buildToolRegistry>[0]['branching'];

    const reg = buildToolRegistry({ branching }, baseCore, makeRegistryContext());
    const gfs = reg.deferred.find((t) => t.name === 'gfsStatus')!;
    const r = (await exec(gfs.tool as unknown as ToolExecHandle)) as Record<string, unknown>;
    expect(r.ok).toBe(true);
    expect(r.available).toBe(true);
    expect(r.initialized).toBe(false);
  });
});
