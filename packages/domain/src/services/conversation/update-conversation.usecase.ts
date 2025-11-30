import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { ConversationEntity, Conversation } from '../../entities';
import { IConversationRepository } from '../../repositories';
import {
  ConversationOutput,
  UpdateConversationInput,
  UpdateConversationUseCase,
} from '../../usecases';

export class UpdateConversationService implements UpdateConversationUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(
    conversationDTO: UpdateConversationInput,
  ): Promise<ConversationOutput> {
    const existingConversation = await this.conversationRepository.findById(
      conversationDTO.id,
    );
    if (!existingConversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with id '${conversationDTO.id}' not found`,
        data: { conversationId: conversationDTO.id },
      });
    }

    const updatedConversation = ConversationEntity.update(
      existingConversation,
      conversationDTO,
    );

    const conversation = await this.conversationRepository.update(
      updatedConversation as unknown as Conversation,
    );
    return ConversationOutput.new(conversation);
  }
}
