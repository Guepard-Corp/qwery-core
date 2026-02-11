import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

import { Entity } from '../common/entity';
import { Roles } from '../common/roles';

export const UserRoleSchema = z.nativeEnum(Roles).default(Roles.USER);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.string().uuid().describe('The unique identifier for the user'),
  username: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9-]+$/, {
      message: 'Username must contain only alphanumeric characters and dashes',
    })
    .describe('The name of the user (alphanumeric and dashes only)'),
  role: UserRoleSchema.describe('The role of the user'),
  createdAt: z.date().describe('The date and time the user was created'),
  updatedAt: z.date().describe('The date and time the user was last updated'),
});

export type User = z.infer<typeof UserSchema>;

export class UserEntity extends Entity<string, typeof UserSchema> {
  public username: string;
  public role: UserRole;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: User) {
    super(UserSchema, data.id);
    this.username = data.username;
    this.role = data.role;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  protected override getData(): User {
    return {
      id: this.getId(),
      username: this.username,
      role: this.role,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  static new(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): UserEntity {
    const now = new Date();
    const user: User = {
      id: uuidv4(),
      username: data.username,
      role: data.role,
      createdAt: now,
      updatedAt: now,
    };
    return new UserEntity(user);
  }
}
