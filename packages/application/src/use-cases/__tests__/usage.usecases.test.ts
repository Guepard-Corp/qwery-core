import { describe, expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import type { IModelCatalog, ModelsDevCatalog } from '@qwery/domain';
import { getUsage, listUsageBySession, recordUsage, trackAgentTurn } from '../usage';
import { InMemoryUsageRepo } from './repo-mocks';

function fixedCatalog(): IModelCatalog {
  const catalog: ModelsDevCatalog = {
    anthropic: {
      models: {
        'claude-opus': {
          cost: { input: 15, output: 75 },
        },
      },
    },
  };
  return { getCatalog: async () => catalog };
}

describe('recordUsage', () => {
  test('persists a usage record', async () => {
    const deps = { usageRepo: new InMemoryUsageRepo() };
    const u = await recordUsage(deps, {
      model: 'anthropic/claude-opus',
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
    });
    expect((await getUsage(deps, u.id))?.model).toBe('anthropic/claude-opus');
  });
});

describe('listUsageBySession', () => {
  test('filters by session', async () => {
    const deps = { usageRepo: new InMemoryUsageRepo() };
    const sid = randomUUID();
    await recordUsage(deps, { model: 'm', sessionId: sid });
    await recordUsage(deps, { model: 'm', sessionId: randomUUID() });
    expect((await listUsageBySession(deps, sid)).length).toBe(1);
  });
});

describe('trackAgentTurn', () => {
  test('computes cost from the catalog and persists usage', async () => {
    const deps = { usageRepo: new InMemoryUsageRepo(), modelCatalog: fixedCatalog() };
    const u = await trackAgentTurn(deps, {
      modelKey: 'anthropic/claude-opus',
      usage: { inputTokens: 1_000_000, outputTokens: 100_000 },
      durationMs: 5000,
    });
    // 1M input @ $15/M = $15, 100k output @ $75/M = $7.5 → total $22.5
    expect(u.costUSD).toBeCloseTo(22.5, 5);
    expect(u.inputCostUSD).toBeCloseTo(15, 5);
    expect(u.outputCostUSD).toBeCloseTo(7.5, 5);
    expect(u.durationMs).toBe(5000);
  });

  test('records at $0 when the model is unknown rather than failing', async () => {
    const deps = { usageRepo: new InMemoryUsageRepo(), modelCatalog: fixedCatalog() };
    const u = await trackAgentTurn(deps, {
      modelKey: 'unknown/model',
      usage: { inputTokens: 100, outputTokens: 50 },
      durationMs: 0,
    });
    expect(u.costUSD).toBe(0);
  });

  test('records at $0 when the catalog fetch throws', async () => {
    const failingCatalog: IModelCatalog = {
      getCatalog: async () => {
        throw new Error('network');
      },
    };
    const deps = { usageRepo: new InMemoryUsageRepo(), modelCatalog: failingCatalog };
    const u = await trackAgentTurn(deps, {
      modelKey: 'anthropic/claude-opus',
      usage: { inputTokens: 100, outputTokens: 50 },
      durationMs: 100,
    });
    expect(u.costUSD).toBe(0);
    expect(u.inputTokens).toBe(100);
  });

  test('totalTokens defaults to input+output when not provided', async () => {
    const deps = { usageRepo: new InMemoryUsageRepo(), modelCatalog: fixedCatalog() };
    const u = await trackAgentTurn(deps, {
      modelKey: 'anthropic/claude-opus',
      usage: { inputTokens: 100, outputTokens: 50 },
      durationMs: 0,
    });
    expect(u.totalTokens).toBe(150);
  });
});
