import { IConversationRepository } from '../../repositories';
import { ConversationOutput, GetConversationsUseCase } from '../../usecases';

export class GetConversationsService implements GetConversationsUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(): Promise<ConversationOutput[]> {
    const conversations = await this.conversationRepository.findAll();
    if (!conversations || conversations.length === 0) {
      return [];
    }
    return conversations.map((conversation) =>
      ConversationOutput.new(conversation),
    );
  }
}
