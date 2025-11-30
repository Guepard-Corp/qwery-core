import { UseCase } from '../usecase';
import { ConversationOutput } from '../dto';

export type GetConversationsUseCase = UseCase<void, ConversationOutput[]>;
