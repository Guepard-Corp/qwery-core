import { v4 as uuidv4 } from 'uuid';
import type { User } from '@qwery/domain/entities';
import { RepositoryFindOptions, Roles } from '@qwery/domain/common';
import { IUserRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'user';

type Row = Record<string, unknown>;

function serialize(user: User): Row {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

function deserialize(row: Row): User {
  return {
    id: row.id as string,
    username: row.username as string,
    role: (row.role as User['role']) ?? Roles.USER,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
  };
}

export class UserRepository extends IUserRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<User[]> {
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    return items;
  }

  async findById(id: string): Promise<User | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<User | null> {
    const all = await this.findAll();
    return all.find((u) => u.username === slug) ?? null;
  }

  async create(entity: User): Promise<User> {
    const now = new Date();
    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      role: entity.role || Roles.USER,
    };
    await Storage.write([ENTITY, entityWithId.id], serialize(entityWithId));
    return entityWithId;
  }

  async update(entity: User): Promise<User> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`User with id ${entity.id} not found`);
    }
    const updated = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
    };
    await Storage.write([ENTITY, entity.id], serialize(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await Storage.remove([ENTITY, id]);
    return true;
  }
}
