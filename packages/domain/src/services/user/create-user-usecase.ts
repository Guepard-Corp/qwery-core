import { Roles } from '../../common/roles';
import { User, UserEntity } from '../../entities';
import { IUserRepository } from '../../repositories';
import { CreateUserUseCase } from '../../usecases';
import { CreateUserInput, UserOutput } from '../../usecases/dto';

export class CreateUserService implements CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  public async execute(port: CreateUserInput): Promise<UserOutput> {
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
    return UserOutput.new(user);
  }
}
