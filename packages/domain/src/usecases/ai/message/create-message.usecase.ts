import { Result } from '../../../common';
import { ConversationNotFoundError } from '../../../exceptions';
import { CreateMessageInput, MessageOutput } from '../../dto';
import { UseCase } from '../../usecase';

export type CreateMessageUseCase = UseCase<
  { input: CreateMessageInput; conversationSlug: string },
  Result<MessageOutput, ConversationNotFoundError>
>;
