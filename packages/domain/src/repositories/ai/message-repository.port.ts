import { Message } from '../../entities';
import { RepositoryPort } from '../base-repository.port';

export abstract class IMessageRepository extends RepositoryPort<
  Message,
  string
> {
  public abstract findByConversationId(
    conversationId: string,
  ): Promise<Message[]>;
}
