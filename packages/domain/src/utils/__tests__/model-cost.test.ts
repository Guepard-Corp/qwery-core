import { describe, expect, test } from 'bun:test';
import { computeUsageCost, getContextLimit, type ModelsDevCatalog } from '../model-cost';

const catalog: ModelsDevCatalog = {
  anthropic: {
    models: {
      'claude-opus': {
        cost: { input: 15, output: 75, cache_read: 1.5, cache_write: 18.75 },
        limit: { context: 200_000 },
      },
      'cheap-only': {
        cost: { input: 1, output: 2 },
      },
      'with-over-200k': {
        cost: {
          input: 3,
          output: 15,
          context_over_200k: { input: 6, output: 22.5 },
        },
      },
    },
  },
  noprefix: {
    models: {
      bare: { cost: { input: 1, output: 1 } },
    },
  },
};

describe('getContextLimit', () => {
  test('returns the limit from the catalog when present', () => {
    expect(getContextLimit(catalog, 'anthropic/claude-opus')).toBe(200_000);
  });

  test('returns null when the model is unknown', () => {
    expect(getContextLimit(catalog, 'anthropic/unknown')).toBeNull();
  });

  test('returns null when the provider is unknown', () => {
    expect(getContextLimit(catalog, 'unknown/m')).toBeNull();
  });

  test('returns null for a model without a context limit', () => {
    expect(getContextLimit(catalog, 'anthropic/cheap-only')).toBeNull();
  });

  test('treats a plain model id (no provider/) as missing', () => {
    expect(getContextLimit(catalog, 'bare')).toBeNull();
  });
});

describe('computeUsageCost', () => {
  test('subtracts cached input tokens from billed input by default', () => {
    const r = computeUsageCost(catalog, 'anthropic/claude-opus', {
      inputTokens: 1_000_000,
      cachedInputTokens: 100_000,
      outputTokens: 0,
    });
    // billed input = 1M - 100k cached - 0 cache write = 900k → 900k * 15 / 1M = 13.5
    // cache_read = 100k * 1.5 / 1M = 0.15 → total 13.65
    expect(r.inputTokenCostUSD).toBeCloseTo(13.65, 4);
  });

  test('when anthropic metadata excludes cached, input is NOT reduced', () => {
    const r = computeUsageCost(
      catalog,
      'anthropic/claude-opus',
      { inputTokens: 1_000_000, cachedInputTokens: 100_000, outputTokens: 0 },
      { anthropic: { cacheCreationInputTokens: 50_000 } },
    );
    // input billed at 1M * 15/1M = 15, cache read 100k * 1.5/1M = 0.15
    // cache write 50k * 18.75/1M = 0.9375 → total 16.0875
    expect(r.inputTokenCostUSD).toBeCloseTo(16.0875, 4);
    expect(r.tokens.cache.write).toBe(50_000);
  });

  test('uses context_over_200k pricing when total input crosses 200k', () => {
    const r = computeUsageCost(catalog, 'anthropic/with-over-200k', {
      inputTokens: 300_000,
      outputTokens: 0,
    });
    // 300k * 6/1M = 1.80
    expect(r.inputTokenCostUSD).toBeCloseTo(1.8, 4);
  });

  test('zero cost for unknown model', () => {
    const r = computeUsageCost(catalog, 'unknown/model', {
      inputTokens: 1000,
      outputTokens: 500,
    });
    expect(r.cost).toBe(0);
  });

  test('reads bedrock cacheWriteInputTokens from metadata', () => {
    const r = computeUsageCost(
      catalog,
      'anthropic/claude-opus',
      { inputTokens: 1000, outputTokens: 0 },
      { bedrock: { usage: { cacheWriteInputTokens: 200 } } },
    );
    expect(r.tokens.cache.write).toBe(200);
  });

  test('reads venice cacheCreationInputTokens from metadata', () => {
    const r = computeUsageCost(
      catalog,
      'anthropic/claude-opus',
      { inputTokens: 1000, outputTokens: 0 },
      { venice: { usage: { cacheCreationInputTokens: 300 } } },
    );
    expect(r.tokens.cache.write).toBe(300);
  });

  test('non-object metadata is treated as absent', () => {
    const r = computeUsageCost(
      catalog,
      'anthropic/claude-opus',
      { inputTokens: 1000, outputTokens: 0 },
      // @ts-expect-error metadata can be of any shape; null-like inputs are handled
      null,
    );
    expect(r.tokens.cache.write).toBe(0);
  });

  test('handles NaN / non-finite inputs by treating them as 0', () => {
    const r = computeUsageCost(catalog, 'anthropic/claude-opus', {
      inputTokens: Number.NaN,
      outputTokens: Number.POSITIVE_INFINITY,
    });
    expect(Number.isFinite(r.cost)).toBe(true);
  });
});
