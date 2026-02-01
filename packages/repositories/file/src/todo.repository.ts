import type { TodoItem } from '@qwery/domain/entities';
import { ITodoRepository } from '@qwery/domain/repositories';
import { read, write, NotFoundError } from './storage.js';

const ENTITY = 'todo';

export class TodoRepository extends ITodoRepository {
  async findByConversationId(conversationId: string): Promise<TodoItem[]> {
    try {
      const data = await read<TodoItem[]>([ENTITY, conversationId]);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      if (error instanceof NotFoundError) {
        return [];
      }
      throw error;
    }
  }

  async upsertByConversationId(
    conversationId: string,
    todos: TodoItem[],
  ): Promise<TodoItem[]> {
    await write([ENTITY, conversationId], todos);
    return todos;
  }
}
