import { UseCase } from '../usecase';
import { ConversationOutput, CreateConversationInput } from '../dto';

export type CreateConversationUseCase = UseCase<
  CreateConversationInput,
  ConversationOutput
>;
