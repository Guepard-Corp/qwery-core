/**
 * models.dev-shaped cost computation.
 * Prices are per 1M tokens (USD). Formula adapted from OpenCode's
 * `Session.getUsage` (and qwery-core/packages/shared/src/model-cost/cost.ts).
 */

export type ModelCost = {
  input: number;
  output: number;
  cache_read?: number;
  cache_write?: number;
  context_over_200k?: {
    input: number;
    output: number;
    cache_read?: number;
    cache_write?: number;
  };
};

export type ModelLimits = {
  /** Maximum input context size in tokens. */
  context?: number;
  /** Maximum output tokens. */
  output?: number;
};

export type CatalogModel = {
  cost?: ModelCost;
  limit?: ModelLimits;
  [key: string]: unknown;
};

export type CatalogProvider = {
  models: Record<string, CatalogModel>;
  [key: string]: unknown;
};

export type ModelsDevCatalog = Record<string, CatalogProvider>;

export type UsageInput = {
  inputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
};

export type ProviderMetadata = Record<string, unknown>;

export type ComputedCost = {
  cost: number;
  inputTokenCostUSD: number;
  outputTokenCostUSD: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cache: { read: number; write: number };
  };
};

const safe = (value: number): number => (Number.isFinite(value) ? value : 0);
const mulDiv = (tokens: number, pricePer1M: number): number => safe((tokens * (pricePer1M ?? 0)) / 1_000_000);

/** Resolve the input context limit (in tokens) for a model in the catalog. */
export function getContextLimit(catalog: ModelsDevCatalog, modelKey: string): number | null {
  const [providerId, modelId] = modelKey.includes('/') ? modelKey.split('/', 2) : ['', modelKey];
  const limit = providerId ? catalog[providerId]?.models?.[modelId ?? '']?.limit?.context : undefined;
  return typeof limit === 'number' && Number.isFinite(limit) && limit > 0 ? limit : null;
}

function cacheWriteFromMetadata(metadata?: ProviderMetadata): number {
  if (!metadata || typeof metadata !== 'object') return 0;
  const m = metadata as Record<string, unknown>;
  const anthropic = m.anthropic as Record<string, unknown> | undefined;
  if (anthropic && typeof anthropic.cacheCreationInputTokens === 'number')
    return anthropic.cacheCreationInputTokens;
  const bedrock = m.bedrock as Record<string, unknown> | undefined;
  const bedrockUsage = bedrock?.usage as Record<string, unknown> | undefined;
  if (typeof bedrockUsage?.cacheWriteInputTokens === 'number')
    return bedrockUsage.cacheWriteInputTokens as number;
  const venice = m.venice as Record<string, unknown> | undefined;
  const veniceUsage = venice?.usage as Record<string, unknown> | undefined;
  if (typeof veniceUsage?.cacheCreationInputTokens === 'number')
    return veniceUsage.cacheCreationInputTokens as number;
  return 0;
}

function excludesCachedTokens(metadata?: ProviderMetadata): boolean {
  if (!metadata || typeof metadata !== 'object') return false;
  const m = metadata as Record<string, unknown>;
  return !!(m.anthropic || m.bedrock);
}

/**
 * Compute cost (USD) and normalized tokens from a catalog + model key + usage.
 *
 * @param catalog  models.dev-shaped catalog (`providerId → { models: { modelId → { cost? } } }`)
 * @param modelKey `"providerId/modelId"` (e.g. `"openai/gpt-4o"`); falls back to plain model id when no `/`
 * @param usage    token counts
 * @param metadata optional provider metadata (anthropic/bedrock/venice cache info)
 */
export function computeUsageCost(
  catalog: ModelsDevCatalog,
  modelKey: string,
  usage: UsageInput,
  metadata?: ProviderMetadata,
): ComputedCost {
  const [providerId, modelId] = modelKey.includes('/') ? modelKey.split('/', 2) : ['', modelKey];
  const provider = providerId ? catalog[providerId] : undefined;
  const model = provider?.models?.[modelId ?? ''];
  const rawCost = model?.cost;

  const cacheRead = safe(usage.cachedInputTokens ?? 0);
  const cacheWrite = cacheWriteFromMetadata(metadata);
  const excludesCached = excludesCachedTokens(metadata);
  const adjustedInput = excludesCached
    ? safe(usage.inputTokens ?? 0)
    : safe(usage.inputTokens ?? 0) - cacheRead - cacheWrite;

  const tokens = {
    input: safe(adjustedInput),
    output: safe(usage.outputTokens ?? 0),
    reasoning: safe(usage.reasoningTokens ?? 0),
    cache: { read: safe(cacheRead), write: safe(cacheWrite) },
  };

  const useOver200k = rawCost?.context_over_200k != null && tokens.input + tokens.cache.read > 200_000;
  const costInfo = useOver200k ? rawCost.context_over_200k! : rawCost;

  const inputPrice = costInfo?.input ?? 0;
  const outputPrice = costInfo?.output ?? 0;
  const cacheReadPrice = costInfo?.cache_read ?? 0;
  const cacheWritePrice = costInfo?.cache_write ?? 0;

  const inputTokenCostUSD =
    mulDiv(tokens.input, inputPrice) +
    mulDiv(tokens.cache.read, cacheReadPrice) +
    mulDiv(tokens.cache.write, cacheWritePrice);
  const outputTokenCostUSD = mulDiv(tokens.output, outputPrice) + mulDiv(tokens.reasoning, outputPrice);
  const cost = inputTokenCostUSD + outputTokenCostUSD;

  return {
    cost: safe(cost),
    inputTokenCostUSD: safe(inputTokenCostUSD),
    outputTokenCostUSD: safe(outputTokenCostUSD),
    tokens,
  };
}
