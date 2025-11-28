import { IMessageRepository } from '../../repositories';
import {
  MessageOutput,
  GetMessagesByConversationIdUseCase,
} from '../../usecases';

export class GetMessagesByConversationIdService
  implements GetMessagesByConversationIdUseCase
{
  constructor(private readonly messageRepository: IMessageRepository) {}

  public async execute(conversationId: string): Promise<MessageOutput[]> {
    const messages =
      await this.messageRepository.findByConversationId(conversationId);
    if (!messages || messages.length === 0) {
      return [];
    }
    return messages.map((message) => MessageOutput.new(message));
  }
}
