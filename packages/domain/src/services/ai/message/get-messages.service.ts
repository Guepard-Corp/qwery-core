import { Code } from '../../../common/code';
import type { Message } from '../../../entities';
import {
  IConversationRepository,
  IMessageRepository,
} from '../../../repositories';
import {
  MessageOutput,
  GetMessagesByConversationIdUseCase,
  GetMessagesByConversationSlugUseCase,
} from '../../../usecases';
import { DomainException } from '../../../exceptions/domain-exception';

export class GetMessagesByConversationIdService
  implements GetMessagesByConversationIdUseCase
{
  constructor(private readonly messageRepository: IMessageRepository) {}

  public async execute(input: {
    conversationId: string;
  }): Promise<MessageOutput[]> {
    if (input.conversationId) {
      const messages = await this.messageRepository.findByConversationId(
        input.conversationId,
      );
      return messages.map((message) => MessageOutput.new(message));
    }

    const messages = await this.messageRepository.findAll();
    return messages.map((message) => MessageOutput.new(message));
  }
}

export class GetMessagesByConversationSlugService
  implements GetMessagesByConversationSlugUseCase
{
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute(input: {
    conversationSlug: string;
  }): Promise<MessageOutput[]> {
    // Validate conversation exists
    const conversation = await this.conversationRepository.findBySlug(
      input.conversationSlug,
    );
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with slug '${input.conversationSlug}' not found`,
        data: { conversationSlug: input.conversationSlug },
      });
    }

    // Check if repository has findByConversationSlug method (frontend API repository)
    if (
      'findByConversationSlug' in this.messageRepository &&
      typeof this.messageRepository.findByConversationSlug === 'function'
    ) {
      interface MessageRepositoryWithSlug extends IMessageRepository {
        findByConversationSlug(conversationSlug: string): Promise<Message[]>;
      }
      const messages = await (
        this.messageRepository as MessageRepositoryWithSlug
      ).findByConversationSlug(input.conversationSlug);
      return messages.map((message) => MessageOutput.new(message));
    }

    // For SQLite/IndexedDB repositories, use conversationId
    const messages = await this.messageRepository.findByConversationId(
      conversation.id,
    );
    return messages.map((message) => MessageOutput.new(message));
  }
}
