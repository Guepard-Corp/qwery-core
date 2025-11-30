import { ConversationEntity, Conversation } from '../../entities';
import { IConversationRepository } from '../../repositories';
import {
  CreateConversationUseCase,
  ConversationOutput,
  CreateConversationInput,
} from '../../usecases';

export class CreateConversationService implements CreateConversationUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(
    conversationDTO: CreateConversationInput,
  ): Promise<ConversationOutput> {
    const newConversation = ConversationEntity.create(conversationDTO);

    const conversation = await this.conversationRepository.create(
      newConversation as unknown as Conversation,
    );
    return ConversationOutput.new(conversation);
  }
}
