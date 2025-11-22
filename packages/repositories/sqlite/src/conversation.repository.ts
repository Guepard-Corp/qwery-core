import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class ConversationRepository extends IConversationRepository {
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

  private serialize(conversation: Conversation): Record<string, unknown> {
    return {
      ...conversation,
      created_at: conversation.createdAt.toISOString(),
      updated_at: conversation.updatedAt.toISOString(),
      project_id: conversation.projectId,
      task_id: conversation.taskId,
      datasources: JSON.stringify(conversation.datasources),
      created_by: conversation.createdBy,
      updated_by: conversation.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Conversation {
    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      projectId: row.project_id as string,
      taskId: row.task_id as string,
      datasources: JSON.parse(row.datasources as string) as string[],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Conversation;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Conversation[]> {
    await this.init();
    let query = 'SELECT * FROM conversations';
    const params: unknown[] = [];

    if (options?.order) {
      query += ` ORDER BY ${options.order}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
      query += ' OFFSET ?';
      params.push(options.offset);
    }

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Conversation | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(slug: string): Promise<Conversation | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM conversations WHERE slug = ?');
    const row = stmt.get(slug) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findByProjectId(projectId: string): Promise<Conversation[]> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM conversations WHERE project_id = ?',
    );
    const rows = stmt.all(projectId) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findByTaskId(taskId: string): Promise<Conversation[]> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM conversations WHERE task_id = ?',
    );
    const rows = stmt.all(taskId) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async create(entity: Conversation): Promise<Conversation> {
    await this.init();

    const now = new Date();

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      datasources: entity.datasources || [],
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      INSERT INTO conversations (id, slug, title, project_id, task_id, datasources, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.slug,
        serialized.title,
        serialized.project_id,
        serialized.task_id,
        serialized.datasources,
        serialized.created_at,
        serialized.updated_at,
        serialized.created_by,
        serialized.updated_by,
      );
      return entityWithSlug;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(
          `Conversation with id ${entityWithId.id} already exists`,
        );
      }
      throw new Error(
        `Failed to create conversation: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Conversation): Promise<Conversation> {
    await this.init();

    const entityWithSlug = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      UPDATE conversations 
      SET slug = ?, title = ?, datasources = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.slug,
      serialized.title,
      serialized.datasources,
      serialized.updated_at,
      serialized.updated_by,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Conversation with id ${entity.id} not found`);
    }

    return entityWithSlug;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM conversations WHERE id = ?');
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
