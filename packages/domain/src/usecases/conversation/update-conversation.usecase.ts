import { UseCase } from '../usecase';
import { ConversationOutput, UpdateConversationInput } from '../dto';

export type UpdateConversationUseCase = UseCase<
  UpdateConversationInput,
  ConversationOutput
>;
