import { Code } from '../../../common/code';
import { DomainException } from '../../../exceptions';
import {
  IConversationRepository,
  ITodoRepository,
} from '../../../repositories';
import type { CreateOrUpdateTodoUseCase } from '../../../usecases';
import type { TodoItem } from '../../../entities';

export class CreateOrUpdateTodoService implements CreateOrUpdateTodoUseCase {
  constructor(
    private readonly todoRepository: ITodoRepository,
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute({
    conversationId,
    todos,
  }: {
    conversationId: string;
    todos: TodoItem[];
  }): Promise<TodoItem[]> {
    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      throw DomainException.new({
        code: Code.CONVERSATION_NOT_FOUND_ERROR,
        overrideMessage: `Conversation with id '${conversationId}' not found`,
        data: { conversationId },
      });
    }

    return this.todoRepository.upsertByConversationId(conversationId, todos);
  }
}
