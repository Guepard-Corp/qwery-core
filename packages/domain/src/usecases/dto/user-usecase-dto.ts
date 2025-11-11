import 'reflect-metadata';
import { User } from '../../entities/user.type';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { Roles } from '../../common/roles';

@Exclude()
export class UserUseCaseDto {
  @Expose()
  public id!: string;

  @Expose()
  public username!: string;

  @Expose()
  public role!: Roles;

  public static new(user: User): UserUseCaseDto {
    return plainToClass(UserUseCaseDto, user);
  }
}
