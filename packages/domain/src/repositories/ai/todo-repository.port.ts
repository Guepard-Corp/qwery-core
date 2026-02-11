import type { TodoItem } from '../../entities';

export abstract class ITodoRepository {
  public abstract findByConversationId(
    conversationId: string,
  ): Promise<TodoItem[]>;

  public abstract upsertByConversationId(
    conversationId: string,
    todos: TodoItem[],
  ): Promise<TodoItem[]>;
}
