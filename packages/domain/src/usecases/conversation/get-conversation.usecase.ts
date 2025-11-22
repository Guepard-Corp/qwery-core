import { UseCase } from '../usecase';
import { ConversationOutput } from '../dto';

export type GetConversationUseCase = UseCase<string, ConversationOutput>;

export type GetConversationBySlugUseCase = UseCase<string, ConversationOutput>;
