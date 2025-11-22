import { IConversationRepository } from '../../repositories';
import {
  ConversationOutput,
  GetConversationsByProjectIdUseCase,
} from '../../usecases';

export class GetConversationsByProjectIdService
  implements GetConversationsByProjectIdUseCase
{
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(projectId: string): Promise<ConversationOutput[]> {
    const conversations =
      await this.conversationRepository.findByProjectId(projectId);
    if (!conversations || conversations.length === 0) {
      return [];
    }
    return conversations.map((conversation) =>
      ConversationOutput.new(conversation),
    );
  }
}
