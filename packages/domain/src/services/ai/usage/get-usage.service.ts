import {
  IConversationRepository,
  IUsageRepository,
} from '../../../repositories';
import { GetUsageByConversationSlugUseCase } from '../../../usecases/ai/usage/get-usage.usecase';
import { UsageOutput } from '../../../usecases';

export class GetUsageByConversationSlugService implements GetUsageByConversationSlugUseCase {
  constructor(
    private readonly usageRepository: IUsageRepository,
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute({
    conversationSlug,
    userId: _userId,
  }: {
    conversationSlug: string;
    userId: string;
  }): Promise<UsageOutput[]> {
    const usageRecords =
      await this.usageRepository.findByConversationSlug(conversationSlug);

    return usageRecords.map((usage) => UsageOutput.new(usage));
  }
}
