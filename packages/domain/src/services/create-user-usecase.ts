import { Roles } from '../common/roles';
import { User, UserEntity } from '../entities/user.type';
import { UserRepositoryPort } from '../repositories/user-repository.port';
import {
  CreateUserPort,
  CreateUserUseCase,
} from '../usecases/create-user-usecase';
import { UserUseCaseDto } from '../usecases/dto/user-usecase-dto';

export class CreateUserService implements CreateUserUseCase {
  constructor(private readonly userRepository: UserRepositoryPort) {}

  public async execute(port: CreateUserPort): Promise<UserUseCaseDto> {
    const newUser = UserEntity.new({
      username: port.username,
      role: port.role || Roles.USER,
    });
    const userData: User = {
      id: newUser.getId(),
      username: newUser.username,
      role: newUser.role,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };
    const user = await this.userRepository.create(userData);
    return UserUseCaseDto.new(user);
  }
}
