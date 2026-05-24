import type { IMessageRepository, Message, PaginatedResult, PaginationOptions } from '@qwery/domain';

export interface MessageRepoDeps {
  messageRepo: IMessageRepository;
}

export async function getMessage(deps: MessageRepoDeps, id: string): Promise<Message | null> {
  return deps.messageRepo.findById(id);
}

export async function listMessagesBySession(deps: MessageRepoDeps, sessionId: string): Promise<Message[]> {
  return deps.messageRepo.findBySessionId(sessionId);
}

export async function listMessagesBySessionPaginated(
  deps: MessageRepoDeps,
  sessionId: string,
  options: PaginationOptions,
): Promise<PaginatedResult<Message>> {
  return deps.messageRepo.findBySessionIdPaginated(sessionId, options);
}
