import { UserOutput, CreateUserInput } from '../dto';
import { UseCase } from '../usecase';

export type CreateUserUseCase = UseCase<CreateUserInput, UserOutput>;
