import {
  createUsage as buildUsage,
  computeUsageCost,
  type IModelCatalog,
  type IUsageRepository,
  type Usage,
  type UsageInput,
} from '@qwery/domain';

export interface TrackAgentTurnDeps {
  usageRepo: IUsageRepository;
  modelCatalog: IModelCatalog;
}

export interface TrackAgentTurnInput {
  sessionId?: string;
  messageId?: string;
  /** `"providerId/modelId"`, e.g. `"openai/gpt-4o"` or `"azure/gpt-5.3-codex"`. */
  modelKey: string;
  usage: UsageInput & { totalTokens?: number };
  durationMs: number;
}

/**
 * Compute the cost for an agent turn from the models.dev catalog and persist
 * a `Usage` record linked to the session/message.
 */
export async function trackAgentTurn(deps: TrackAgentTurnDeps, input: TrackAgentTurnInput): Promise<Usage> {
  let cost = 0;
  let inputCost = 0;
  let outputCost = 0;
  let normalizedCacheWrite = 0;

  try {
    const catalog = await deps.modelCatalog.getCatalog();
    const computed = computeUsageCost(catalog, input.modelKey, input.usage);
    cost = computed.cost;
    inputCost = computed.inputTokenCostUSD;
    outputCost = computed.outputTokenCostUSD;
    normalizedCacheWrite = computed.tokens.cache.write;
  } catch {
    // Catalog unreachable or model unknown — record usage at $0 rather than fail the turn.
  }

  return deps.usageRepo.create(
    buildUsage({
      sessionId: input.sessionId,
      messageId: input.messageId,
      model: input.modelKey,
      inputTokens: input.usage.inputTokens ?? 0,
      outputTokens: input.usage.outputTokens ?? 0,
      reasoningTokens: input.usage.reasoningTokens ?? 0,
      cachedInputTokens: input.usage.cachedInputTokens ?? 0,
      cacheWriteTokens: normalizedCacheWrite,
      totalTokens:
        input.usage.totalTokens ?? (input.usage.inputTokens ?? 0) + (input.usage.outputTokens ?? 0),
      costUSD: cost,
      inputCostUSD: inputCost,
      outputCostUSD: outputCost,
      durationMs: input.durationMs,
      contextSize: 0,
    }),
  );
}
