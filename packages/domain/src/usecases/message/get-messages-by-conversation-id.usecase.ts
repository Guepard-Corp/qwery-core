import { UseCase } from '../usecase';
import { MessageOutput } from '../dto';

export type GetMessagesByConversationIdUseCase = UseCase<
  string,
  MessageOutput[]
>;
