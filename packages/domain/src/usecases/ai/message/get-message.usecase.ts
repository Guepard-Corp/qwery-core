import { UseCase } from '../../usecase';
import { MessageOutput } from '../../dto';

export type GetMessageUseCase = UseCase<string, MessageOutput>;
