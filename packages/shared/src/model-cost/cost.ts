/**
 * OpenCode-style cost computation from a models.dev-shaped catalog.
 * Prices are per 1M tokens (USD). Formula matches opencode Session.getUsage.
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

export type CatalogModel = {
  cost?: ModelCost;
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

const cacheWriteFromMetadata = (metadata?: ProviderMetadata): number => {
  if (!metadata || typeof metadata !== 'object') return 0;
  const anthropic = (metadata as Record<string, unknown>)['anthropic'] as
    | Record<string, unknown>
    | undefined;
  if (anthropic && typeof anthropic['cacheCreationInputTokens'] === 'number')
    return anthropic['cacheCreationInputTokens'] as number;
  const bedrock = (metadata as Record<string, unknown>)['bedrock'] as
    | Record<string, unknown>
    | undefined;
  const bedrockUsage = bedrock?.usage as Record<string, unknown> | undefined;
  if (typeof bedrockUsage?.['cacheWriteInputTokens'] === 'number')
    return bedrockUsage['cacheWriteInputTokens'] as number;
  const venice = (metadata as Record<string, unknown>)['venice'] as
    | Record<string, unknown>
    | undefined;
  const veniceUsage = venice?.usage as Record<string, unknown> | undefined;
  if (typeof veniceUsage?.['cacheCreationInputTokens'] === 'number')
    return veniceUsage['cacheCreationInputTokens'] as number;
  return 0;
};

const excludesCachedTokens = (metadata?: ProviderMetadata): boolean => {
  if (!metadata || typeof metadata !== 'object') return false;
  const m = metadata as Record<string, unknown>;
  return !!(m['anthropic'] || m['bedrock']);
};

export type GetUsageResult = {
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

const mulDiv = (tokens: number, pricePer1M: number): number =>
  safe((tokens * (pricePer1M ?? 0)) / 1_000_000);

/**
 * Compute cost and normalized tokens from catalog + model key + usage (opencode-style).
 * @param catalog - models.dev-shaped catalog (provider id -> { models: { modelId -> { cost?: ModelCost } } })
 * @param modelKey - "providerId/modelId" (e.g. "openai/gpt-4o")
 * @param usage - token counts (inputTokens, outputTokens, reasoningTokens?, cachedInputTokens?)
 * @param metadata - optional provider metadata for cache write (anthropic, bedrock, venice)
 */
export function getUsageFromCatalog(
  catalog: ModelsDevCatalog,
  modelKey: string,
  usage: UsageInput,
  metadata?: ProviderMetadata,
): GetUsageResult {
  const [providerId, modelId] = modelKey.includes('/')
    ? modelKey.split('/', 2)
    : ['', modelKey];
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

  const useOver200k =
    rawCost?.context_over_200k != null &&
    tokens.input + tokens.cache.read > 200_000;
  const costInfo = useOver200k ? rawCost.context_over_200k! : rawCost;

  const inputPrice = costInfo?.input ?? 0;
  const outputPrice = costInfo?.output ?? 0;
  const cacheReadPrice = costInfo?.cache_read ?? 0;
  const cacheWritePrice = costInfo?.cache_write ?? 0;

  const inputTokenCostUSD =
    mulDiv(tokens.input, inputPrice) +
    mulDiv(tokens.cache.read, cacheReadPrice) +
    mulDiv(tokens.cache.write, cacheWritePrice);
  const outputTokenCostUSD =
    mulDiv(tokens.output, outputPrice) + mulDiv(tokens.reasoning, outputPrice);
  const cost = inputTokenCostUSD + outputTokenCostUSD;

  return {
    cost: safe(cost),
    inputTokenCostUSD: safe(inputTokenCostUSD),
    outputTokenCostUSD: safe(outputTokenCostUSD),
    tokens,
  };
}
