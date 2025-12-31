import { type LanguageModelUsage } from 'ai';
import {
  IUsageRepository,
  IConversationRepository,
  IProjectRepository,
} from '@qwery/domain/repositories';
import { CreateUsageService } from '@qwery/domain/services';
import { CreateUsageInput } from '@qwery/domain/usecases';

/**
 * Maps LanguageModelUsage (LanguageModelV2Usage) from AI SDK to CreateUsageInput
 */
function mapLanguageModelUsageToCreateUsageInput(
  usage: LanguageModelUsage,
  model: string,
  userId: string = 'system',
): Omit<CreateUsageInput, 'conversationId' | 'projectId' | 'organizationId'> {
  return {
    userId,
    model,
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    reasoningTokens: usage.reasoningTokens ?? 0,
    cachedInputTokens: usage.cachedInputTokens ?? 0,
    contextSize: 0, // Not available in LanguageModelV2Usage
    creditsCap: 0,
    creditsUsed: 0,
    cpu: 0,
    memory: 0,
    network: 0,
    gpu: 0,
    storage: 0,
  };
}

export class UsagePersistenceService {
  constructor(
    private readonly usageRepository: IUsageRepository,
    private readonly conversationRepository: IConversationRepository,
    private readonly projectRepository: IProjectRepository,
    private readonly conversationSlug: string,
  ) {}

  /**
   * Persists LanguageModelUsage to the database with idempotency
   * Silently ignores duplicate usage records (same ID already exists)
   * @param usage - LanguageModelUsage from AI SDK
   * @param model - Model identifier (e.g., 'azure/gpt-5-mini')
   * @param userId - User identifier (default: 'system')
   */
  async persistUsage(
    usage: LanguageModelUsage,
    model: string,
    userId: string = 'system',
  ): Promise<void> {
    const useCase = new CreateUsageService(
      this.usageRepository,
      this.conversationRepository,
      this.projectRepository,
    );

    const input = mapLanguageModelUsageToCreateUsageInput(usage, model, userId);

    try {
      await useCase.execute({
        input: input as CreateUsageInput,
        conversationSlug: this.conversationSlug,
      });
    } catch (error) {
      // Handle idempotency: if usage already exists, silently ignore
      // This can happen if the same usage record is created twice due to timing
      if (
        error instanceof Error &&
        error.message.includes('already exists')
      ) {
        // Usage record already exists - this is idempotent, so log as debug and continue
        console.debug(
          `[UsagePersistenceService] Usage record already exists (idempotent): ${error.message}`,
        );
        return;
      }
      // Re-throw other errors
      throw error;
    }
  }
}
