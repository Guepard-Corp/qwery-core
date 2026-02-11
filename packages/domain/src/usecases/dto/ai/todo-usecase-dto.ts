import type { TodoItem } from '../../../entities';

export type CreateOrUpdateTodoInput = {
  conversationId: string;
  todos: TodoItem[];
};
