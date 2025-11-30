import { UseCase } from '../usecase';
import { ConversationOutput } from '../dto';

export type GetConversationsByProjectIdUseCase = UseCase<
  string,
  ConversationOutput[]
>;
