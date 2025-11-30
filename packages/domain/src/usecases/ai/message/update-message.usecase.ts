import { UpdateMessageInput, MessageOutput } from '../../dto';
import { UseCase } from '../../usecase';

export type UpdateMessageUseCase = UseCase<UpdateMessageInput, MessageOutput>;
