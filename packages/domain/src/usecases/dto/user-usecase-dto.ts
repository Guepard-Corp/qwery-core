import 'reflect-metadata';
import { User } from '../../entities';
import { Exclude, Expose, plainToClass } from 'class-transformer';
import { Roles } from '../../common/roles';

@Exclude()
export class UserOutput {
  @Expose()
  public id!: string;

  @Expose()
  public username!: string;

  @Expose()
  public role!: Roles;

  public static new(user: User): UserOutput {
    return plainToClass(UserOutput, user);
  }
}

export type CreateUserInput = {
  username: string;
  role?: Roles;
};

export type UpdateUserInput = {
  id: string;
  username?: string;
  role?: Roles;
};
