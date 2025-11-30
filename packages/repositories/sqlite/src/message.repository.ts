import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Message } from '@qwery/domain/entities';
import { IMessageRepository } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class MessageRepository extends IMessageRepository {
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

  private serialize(message: Message): Record<string, unknown> {
    return {
      id: message.id,
      conversation_id: message.conversationId,
      content: JSON.stringify(message.content || {}),
      role: message.role,
      metadata: JSON.stringify(message.metadata || {}),
      created_at: message.createdAt.toISOString(),
      updated_at: message.updatedAt.toISOString(),
      created_by: message.createdBy,
      updated_by: message.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Message {
    return {
      id: row.id as string,
      conversationId: row.conversation_id as string,
      content: JSON.parse((row.content as string) || '{}') as Record<
        string,
        unknown
      >,
      role: row.role as string,
      metadata: JSON.parse((row.metadata as string) || '{}') as Record<
        string,
        unknown
      >,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Message;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    await this.init();
    let query = 'SELECT * FROM messages';
    const params: unknown[] = [];

    if (options?.order) {
      query += ` ORDER BY ${options.order}`;
    } else {
      query += ' ORDER BY created_at ASC';
    }

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      // SQLite requires LIMIT before OFFSET, so if offset is provided without limit, use a large limit
      if (!options?.limit) {
        query += ' LIMIT -1';
      }
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Message | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM messages WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(_slug: string): Promise<Message | null> {
    // Messages don't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC',
    );
    const rows = stmt.all(conversationId) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async create(entity: Message): Promise<Message> {
    await this.init();

    const now = new Date();

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      metadata: entity.metadata || {},
    };

    const serialized = this.serialize(entityWithId);
    const stmt = this.db.prepare(`
      INSERT INTO messages (id, conversation_id, content, role, metadata, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.conversation_id,
        serialized.content,
        serialized.role,
        serialized.metadata,
        serialized.created_at,
        serialized.updated_at,
        serialized.created_by,
        serialized.updated_by,
      );
      return entityWithId;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(`Message with id ${entityWithId.id} already exists`);
      }
      throw new Error(
        `Failed to create message: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Message): Promise<Message> {
    await this.init();

    const updatedEntity = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
    };

    const serialized = this.serialize(updatedEntity);
    const stmt = this.db.prepare(`
      UPDATE messages 
      SET content = ?, metadata = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.content,
      serialized.metadata,
      serialized.updated_at,
      serialized.updated_by,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Message with id ${entity.id} not found`);
    }

    return updatedEntity;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM messages WHERE id = ?');
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
