import type Database from 'better-sqlite3';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Usage } from '@qwery/domain/entities';
import { IUsageRepository } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class UsageRepository extends IUsageRepository {
  private db: Database.Database;
  private initPromise: Promise<void> | null = null;
  private lastTimestampId = 0; // Track last ID to prevent collisions

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

  private serialize(usage: Usage): Record<string, unknown> {
    return {
      id: usage.id,
      conversation_id: usage.conversationId,
      project_id: usage.projectId,
      organization_id: usage.organizationId,
      user_id: usage.userId,
      model: usage.model,
      input_tokens: usage.inputTokens ?? 0,
      output_tokens: usage.outputTokens ?? 0,
      total_tokens: usage.totalTokens ?? 0,
      reasoning_tokens: usage.reasoningTokens ?? 0,
      cached_input_tokens: usage.cachedInputTokens ?? 0,
      context_size: usage.contextSize ?? 0,
      credits_cap: usage.creditsCap ?? 0,
      credits_used: usage.creditsUsed ?? 0,
      cpu: usage.cpu ?? 0,
      memory: usage.memory ?? 0,
      network: usage.network ?? 0,
      gpu: usage.gpu ?? 0,
      storage: usage.storage ?? 0,
    };
  }

  private deserialize(row: Record<string, unknown>): Usage {
    return {
      id: row.id as number,
      conversationId: row.conversation_id as string,
      projectId: row.project_id as string,
      organizationId: row.organization_id as string,
      userId: row.user_id as string,
      model: row.model as string,
      inputTokens: (row.input_tokens as number) || 0,
      outputTokens: (row.output_tokens as number) || 0,
      totalTokens: (row.total_tokens as number) || 0,
      reasoningTokens: (row.reasoning_tokens as number) || 0,
      cachedInputTokens: (row.cached_input_tokens as number) || 0,
      contextSize: (row.context_size as number) || 0,
      creditsCap: (row.credits_cap as number) || 0,
      creditsUsed: (row.credits_used as number) || 0,
      cpu: (row.cpu as number) || 0,
      memory: (row.memory as number) || 0,
      network: (row.network as number) || 0,
      gpu: (row.gpu as number) || 0,
      storage: (row.storage as number) || 0,
    } as Usage;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
    await this.init();
    let query = 'SELECT * FROM usage';
    const params: unknown[] = [];

    if (options?.order) {
      query += ` ORDER BY ${options.order}`;
    } else {
      // Default to time series order (newest first for time series data)
      query += ' ORDER BY id DESC';
    }

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    if (options?.offset) {
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

  async findById(id: string): Promise<Usage | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM usage WHERE id = ?');
    const row = stmt.get(Number(id)) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(_slug: string): Promise<Usage | null> {
    // Usage doesn't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Usage[]> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM usage WHERE conversation_id = ? ORDER BY id DESC',
    );
    const rows = stmt.all(conversationId) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findByConversationSlug(conversationSlug: string): Promise<Usage[]> {
    await this.init();
    // First, get the conversation ID from the slug
    const conversationStmt = this.db.prepare(
      'SELECT id FROM conversations WHERE slug = ?',
    );
    const conversation = conversationStmt.get(conversationSlug) as
      | { id: string }
      | undefined;

    if (!conversation) {
      return [];
    }

    // Then find usage by conversation ID
    return this.findByConversationId(conversation.id);
  }

  async create(entity: Usage): Promise<Usage> {
    await this.init();

    // Generate a high-resolution timestamp ID using clock ticks to avoid collisions
    // Uses process.hrtime for nanosecond precision combined with Date.now()
    const generateTimestampId = (): number => {
      const baseTime = Date.now();
      // Get high-resolution time since process start (nanoseconds)
      const hrtime = process.hrtime();
      // Convert nanoseconds to microseconds (0-999,999 range)
      const microseconds = Math.floor(hrtime[1] / 1000);
      // Combine: base timestamp in milliseconds * 1,000,000 + microseconds
      // This gives us microsecond-level precision (1,000,000 unique values per millisecond)
      let newId = baseTime * 1_000_000 + microseconds;

      // Prevent collisions: if we generated the same ID twice, increment it
      if (newId <= this.lastTimestampId) {
        newId = this.lastTimestampId + 1;
      }

      this.lastTimestampId = newId;
      return newId;
    };

    const entityWithId = {
      ...entity,
      id: entity.id && entity.id > 0 ? entity.id : generateTimestampId(),
    };

    const serialized = this.serialize(entityWithId);
    const stmt = this.db.prepare(`
      INSERT INTO usage (
        id, conversation_id, project_id, organization_id, user_id, model,
        input_tokens, output_tokens, total_tokens, reasoning_tokens,
        cached_input_tokens, context_size, credits_cap, credits_used,
        cpu, memory, network, gpu, storage
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.conversation_id,
        serialized.project_id,
        serialized.organization_id,
        serialized.user_id,
        serialized.model,
        serialized.input_tokens,
        serialized.output_tokens,
        serialized.total_tokens,
        serialized.reasoning_tokens,
        serialized.cached_input_tokens,
        serialized.context_size,
        serialized.credits_cap,
        serialized.credits_used,
        serialized.cpu,
        serialized.memory,
        serialized.network,
        serialized.gpu,
        serialized.storage,
      );
      return entityWithId;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(`Usage with id ${entityWithId.id} already exists`);
      }
      throw new Error(
        `Failed to create usage: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Usage): Promise<Usage> {
    await this.init();

    const serialized = this.serialize(entity);
    const stmt = this.db.prepare(`
      UPDATE usage
      SET
        conversation_id = ?, project_id = ?, organization_id = ?, user_id = ?, model = ?,
        input_tokens = ?, output_tokens = ?, total_tokens = ?, reasoning_tokens = ?,
        cached_input_tokens = ?, context_size = ?, credits_cap = ?, credits_used = ?,
        cpu = ?, memory = ?, network = ?, gpu = ?, storage = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.conversation_id,
      serialized.project_id,
      serialized.organization_id,
      serialized.user_id,
      serialized.model,
      serialized.input_tokens,
      serialized.output_tokens,
      serialized.total_tokens,
      serialized.reasoning_tokens,
      serialized.cached_input_tokens,
      serialized.context_size,
      serialized.credits_cap,
      serialized.credits_used,
      serialized.cpu,
      serialized.memory,
      serialized.network,
      serialized.gpu,
      serialized.storage,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Usage with id ${entity.id} not found`);
    }

    return entity;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM usage WHERE id = ?');
    const result = stmt.run(Number(id));
    return result.changes > 0;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  public shortenId(id: string): string {
    return super.shortenId(id);
  }
}
