import { UseCase } from '../../usecase';
import { MessageOutput } from '../../dto';

export type GetMessagesByConversationSlugUseCase = UseCase<
  { conversationSlug: string },
  MessageOutput[]
>;

export type GetMessagesByConversationIdUseCase = UseCase<
  { conversationId: string },
  MessageOutput[]
>;
