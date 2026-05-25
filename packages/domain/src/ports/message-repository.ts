import type { PaginatedResult, PaginationOptions } from '../common';
import type { Message } from '../entities/message.entity';
import { RepositoryPort } from './base-repository';

export abstract class IMessageRepository extends RepositoryPort<Message, string> {
  public abstract findBySessionId(sessionId: string): Promise<Message[]>;

  public abstract findBySessionIdPaginated(
    sessionId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>>;
}
