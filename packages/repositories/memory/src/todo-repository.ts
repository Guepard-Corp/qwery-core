import type { TodoItem } from '@qwery/domain/entities';
import { ITodoRepository } from '@qwery/domain/repositories';

export class TodoRepository extends ITodoRepository {
  private todosByConversation = new Map<string, TodoItem[]>();

  async findByConversationId(conversationId: string): Promise<TodoItem[]> {
    const todos = this.todosByConversation.get(conversationId);
    return todos ?? [];
  }

  async upsertByConversationId(
    conversationId: string,
    todos: TodoItem[],
  ): Promise<TodoItem[]> {
    this.todosByConversation.set(conversationId, todos);
    return todos;
  }
}
