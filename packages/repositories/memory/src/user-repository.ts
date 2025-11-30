import type { Nullable, RepositoryFindOptions } from '@qwery/domain/common';
import type { User } from '@qwery/domain/entities';
import { IUserRepository } from '@qwery/domain/repositories';

export class UserRepository extends IUserRepository {
  private users = new Map<string, User>();

  async findAll(options?: RepositoryFindOptions): Promise<User[]> {
    const allUsers = Array.from(this.users.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allUsers.slice(offset, offset + limit);
    }
    return allUsers.slice(offset);
  }

  async findById(id: string): Promise<Nullable<User>> {
    return this.users.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<User>> {
    const users = Array.from(this.users.values());
    return users.find((user) => user.username === slug) ?? null;
  }

  async create(entity: User): Promise<User> {
    this.users.set(entity.id, entity);
    return entity;
  }

  async update(entity: User): Promise<User> {
    if (!this.users.has(entity.id)) {
      throw new Error(`User with id ${entity.id} not found`);
    }
    this.users.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.users.delete(id);
  }
}
