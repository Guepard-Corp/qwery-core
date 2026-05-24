import {
  createMessage as buildMessage,
  type CreateMessageInput,
  type IMessageRepository,
  type Message,
} from '@qwery/domain';

export interface CreateMessageDeps {
  messageRepo: IMessageRepository;
}

export async function createMessage(deps: CreateMessageDeps, input: CreateMessageInput): Promise<Message> {
  const entity = buildMessage(input);
  return deps.messageRepo.create(entity);
}
