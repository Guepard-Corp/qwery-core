import {
  updateMessage as applyUpdate,
  Code,
  Exception,
  type IMessageRepository,
  type Message,
  type UpdateMessageInput,
} from '@qwery/domain';

export interface UpdateMessageDeps {
  messageRepo: IMessageRepository;
}

export async function updateMessage(
  deps: UpdateMessageDeps,
  id: string,
  input: UpdateMessageInput,
): Promise<Message> {
  const existing = await deps.messageRepo.findById(id);
  if (!existing) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `Message ${id} not found`,
    });
  }
  const updated = applyUpdate(existing, input);
  return deps.messageRepo.update(updated);
}
