import { Result } from '../../../common';
import { MessageEntity, Message } from '../../../entities';
import { ConversationNotFoundError } from '../../../exceptions';
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
  }): Promise<Result<MessageOutput, ConversationNotFoundError>> {
    const conversation =
      await this.conversationRepository.findBySlug(conversationSlug);
    if (!conversation) {
      return Result.fail(new ConversationNotFoundError(conversationSlug));
    }

    const newMessage = MessageEntity.create({
      ...input,
      conversationId: conversation.id,
    });

    const message = await this.messageRepository.create(
      newMessage as unknown as Message,
    );

    await this.conversationRepository.update({
      ...conversation,
      updatedAt: message.updatedAt,
      updatedBy: input.createdBy,
    });

    return Result.ok(MessageOutput.new(message));
  }
}
