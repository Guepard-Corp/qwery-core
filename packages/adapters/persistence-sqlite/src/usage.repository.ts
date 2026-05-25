import { IUsageRepository, type Nullable, type RepositoryFindOptions, type Usage } from '@qwery/domain';
import { asc, eq } from 'drizzle-orm';
import type { DrizzleDb } from './db';
import { usage } from './schema';

type Row = typeof usage.$inferSelect;

function toEntity(r: Row): Usage {
  return {
    id: r.id,
    sessionId: r.sessionId ?? undefined,
    messageId: r.messageId ?? undefined,
    model: r.model,
    inputTokens: r.inputTokens,
    outputTokens: r.outputTokens,
    totalTokens: r.totalTokens,
    reasoningTokens: r.reasoningTokens,
    cachedInputTokens: r.cachedInputTokens,
    cacheWriteTokens: r.cacheWriteTokens,
    costUSD: r.costUsd,
    inputCostUSD: r.inputCostUsd,
    outputCostUSD: r.outputCostUsd,
    durationMs: r.durationMs,
    contextSize: r.contextSize,
    timestamp: new Date(r.timestamp),
  };
}

function toRow(u: Usage) {
  return {
    id: u.id,
    sessionId: u.sessionId ?? null,
    messageId: u.messageId ?? null,
    model: u.model,
    inputTokens: u.inputTokens,
    outputTokens: u.outputTokens,
    totalTokens: u.totalTokens,
    reasoningTokens: u.reasoningTokens,
    cachedInputTokens: u.cachedInputTokens,
    cacheWriteTokens: u.cacheWriteTokens,
    costUsd: u.costUSD,
    inputCostUsd: u.inputCostUSD,
    outputCostUsd: u.outputCostUSD,
    durationMs: u.durationMs,
    contextSize: u.contextSize,
    timestamp: u.timestamp.toISOString(),
  };
}

export class SqliteUsageRepository extends IUsageRepository {
  constructor(private readonly db: DrizzleDb) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db.select().from(usage).orderBy(asc(usage.timestamp)).limit(limit).offset(offset).all();
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Usage>> {
    const row = this.db.select().from(usage).where(eq(usage.id, id)).get();
    return row ? toEntity(row) : null;
  }

  async findBySlug(): Promise<Nullable<Usage>> {
    return null;
  }

  async findBySessionId(sessionId: string): Promise<Usage[]> {
    const rows = this.db
      .select()
      .from(usage)
      .where(eq(usage.sessionId, sessionId))
      .orderBy(asc(usage.timestamp))
      .all();
    return rows.map(toEntity);
  }

  async create(entity: Usage): Promise<Usage> {
    return this.upsert(entity);
  }

  async update(entity: Usage): Promise<Usage> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.db.delete(usage).where(eq(usage.id, id)).returning({ id: usage.id }).all();
    return deleted.length > 0;
  }

  private upsert(u: Usage): Usage {
    const row = toRow(u);
    const { id: _id, ...rest } = row;
    this.db.insert(usage).values(row).onConflictDoUpdate({ target: usage.id, set: rest }).run();
    return u;
  }
}
