import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import { RepositoryFindOptions, Roles } from '@qwery/domain/common';
import type { User } from '@qwery/domain/entities';
import { IUserRepository } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class UserRepository extends IUserRepository {
  private db: Database.Database;
  private initPromise: Promise<void> | null = null;

  constructor(private dbPath?: string) {
    super();
    this.db = createDatabase(dbPath);
    this.init();
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = Promise.resolve(initializeSchema(this.db));
    return this.initPromise;
  }

  private serialize(user: User): Record<string, unknown> {
    return {
      ...user,
      created_at: user.createdAt.toISOString(),
      updated_at: user.updatedAt.toISOString(),
      role: user.role,
    };
  }

  private deserialize(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      username: row.username as string,
      role: row.role as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    } as User;
  }

  async findAll(_options?: RepositoryFindOptions): Promise<User[]> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM users');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<User | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(slug: string): Promise<User | null> {
    await this.init();
    // For users, slug is typically the username
    const stmt = this.db.prepare('SELECT * FROM users WHERE username = ?');
    const row = stmt.get(slug) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async create(entity: User): Promise<User> {
    await this.init();

    const now = new Date();

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      role: entity.role || Roles.USER,
    };

    const serialized = this.serialize(entityWithId);
    const stmt = this.db.prepare(`
      INSERT INTO users (id, username, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.username,
        serialized.role,
        serialized.created_at,
        serialized.updated_at,
      );
      return entityWithId;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(`User with id ${entityWithId.id} already exists`);
      }
      throw new Error(
        `Failed to create user: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: User): Promise<User> {
    await this.init();

    const entityWithUpdated = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
    };

    const serialized = this.serialize(entityWithUpdated);
    const stmt = this.db.prepare(`
      UPDATE users 
      SET username = ?, role = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.username,
      serialized.role,
      serialized.updated_at,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`User with id ${entity.id} not found`);
    }

    return entityWithUpdated;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  public shortenId(id: string): string {
    return super.shortenId(id);
  }
}
