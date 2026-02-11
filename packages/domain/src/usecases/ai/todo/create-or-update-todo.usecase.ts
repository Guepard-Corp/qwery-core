import { UseCase } from '../../usecase';
import type { TodoItem } from '../../../entities';

export type CreateOrUpdateTodoUseCase = UseCase<
  { conversationId: string; todos: TodoItem[] },
  TodoItem[]
>;
