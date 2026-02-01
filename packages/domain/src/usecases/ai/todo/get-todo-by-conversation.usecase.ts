import { UseCase } from '../../usecase';
import type { TodoItem } from '../../../entities';

export type GetTodoByConversationUseCase = UseCase<
  { conversationId: string },
  TodoItem[]
>;
