import { Roles } from '../common/roles';
import { UserUseCaseDto } from './dto/user-usecase-dto';
import { UseCase } from './usecase';

export interface CreateUserPort {
  username: string;
  role?: Roles;
}

export type CreateUserUseCase = UseCase<CreateUserPort, UserUseCaseDto>;
