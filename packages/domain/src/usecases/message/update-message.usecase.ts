import { MessageOutput, UpdateMessageInput } from '../dto';
import { UseCase } from '../usecase';

export type UpdateMessageUseCase = UseCase<UpdateMessageInput, MessageOutput>;
