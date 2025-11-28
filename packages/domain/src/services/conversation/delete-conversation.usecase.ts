import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IConversationRepository } from '../../repositories';
import { DeleteConversationUseCase } from '../../usecases';

export class DeleteConversationService implements DeleteConversationUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(id: string): Promise<boolean> {
    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with id '${id}' not found`,
        data: { conversationId: id },
      });
    }

    return await this.conversationRepository.delete(id);
  }
}
