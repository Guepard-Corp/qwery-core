import {
  IConversationRepository,
  ITodoRepository,
} from '../../../repositories';
import type { GetTodoByConversationUseCase } from '../../../usecases';
import type { TodoItem } from '../../../entities';

export class GetTodoByConversationService
  implements GetTodoByConversationUseCase
{
  constructor(
    private readonly todoRepository: ITodoRepository,
    private readonly conversationRepository: IConversationRepository,
  ) {}

  public async execute({
    conversationId,
  }: {
    conversationId: string;
  }): Promise<TodoItem[]> {
    const conversation =
      await this.conversationRepository.findById(conversationId);
    if (!conversation) {
      return [];
    }

    return this.todoRepository.findByConversationId(conversationId);
  }
}
