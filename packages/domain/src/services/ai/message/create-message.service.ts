import { Code } from '../../../common/code';
import { DomainException } from '../../../exceptions';
import { MessageEntity, Message } from '../../../entities';
import {
  IConversationRepository,
  IMessageRepository,
} from '../../../repositories';
import {
  CreateMessageUseCase,
  CreateMessageInput,
  MessageOutput,
} from '../../../usecases';

export class CreateMessageService implements CreateMessageUseCase {
  constructor(
    private readonly messageRepository: IMessageRepository,
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute({
    input,
    conversationSlug,
  }: {
    input: CreateMessageInput;
    conversationSlug: string;
  }): Promise<MessageOutput> {
    // Resolve conversation ID from slug
    const conversation =
      await this.conversationRepository.findBySlug(conversationSlug);
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with slug '${conversationSlug}' not found`,
        data: { conversationSlug },
      });
    }

    // Create message entity with conversationId
    const newMessage = MessageEntity.create({
      ...input,
      conversationId: conversation.id,
    });

    const message = await this.messageRepository.create(
      newMessage as unknown as Message,
    );
    return MessageOutput.new(message);
  }
}
