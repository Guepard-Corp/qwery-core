import { Code } from '../../common/code';
import { DomainException } from '../../exceptions';
import { MessageEntity, Message } from '../../entities';
import { IMessageRepository } from '../../repositories';
import {
  MessageOutput,
  UpdateMessageInput,
  UpdateMessageUseCase,
} from '../../usecases';

export class UpdateMessageService implements UpdateMessageUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  public async execute(messageDTO: UpdateMessageInput): Promise<MessageOutput> {
    const existingMessage = await this.messageRepository.findById(
      messageDTO.id,
    );
    if (!existingMessage) {
      throw DomainException.new({
        code: Code.MESSAGE_NOT_FOUND_ERROR,
        overrideMessage: `Message with id '${messageDTO.id}' not found`,
        data: { messageId: messageDTO.id },
      });
    }

    const updatedMessage = MessageEntity.update(existingMessage, messageDTO);

    const message = await this.messageRepository.update(
      updatedMessage as unknown as Message,
    );
    return MessageOutput.new(message);
  }
}
