import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { IConversationRepository } from '../../repositories';
import {
  ConversationOutput,
  GetConversationUseCase,
  GetConversationBySlugUseCase,
} from '../../usecases';

export class GetConversationService implements GetConversationUseCase {
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(id: string): Promise<ConversationOutput> {
    const conversation = await this.conversationRepository.findById(id);
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with id '${id}' not found`,
        data: { id },
      });
    }
    return ConversationOutput.new(conversation);
  }
}

export class GetConversationBySlugService
  implements GetConversationBySlugUseCase
{
  constructor(
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(slug: string): Promise<ConversationOutput> {
    const conversation = await this.conversationRepository.findBySlug(slug);
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with slug '${slug}' not found`,
        data: { slug },
      });
    }
    return ConversationOutput.new(conversation);
  }
}
