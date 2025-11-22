import { MessageEntity, Message } from '../../entities';
import { IMessageRepository } from '../../repositories';
import {
  CreateMessageUseCase,
  CreateMessageInput,
  MessageOutput,
} from '../../usecases';

export class CreateMessageService implements CreateMessageUseCase {
  constructor(private readonly messageRepository: IMessageRepository) {}

  public async execute(messageDTO: CreateMessageInput): Promise<MessageOutput> {
    const newMessage = MessageEntity.create(messageDTO);

    const message = await this.messageRepository.create(
      newMessage as unknown as Message,
    );
    return MessageOutput.new(message);
  }
}
