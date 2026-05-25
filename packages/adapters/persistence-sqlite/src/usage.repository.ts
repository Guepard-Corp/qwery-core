import type { Database } from 'bun:sqlite';
import { IUsageRepository, type Nullable, type RepositoryFindOptions, type Usage } from '@qwery/domain';

interface Row {
  id: string;
  session_id: string | null;
  message_id: string | null;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  reasoning_tokens: number;
  cached_input_tokens: number;
  cache_write_tokens: number;
  cost_usd: number;
  input_cost_usd: number;
  output_cost_usd: number;
  duration_ms: number;
  context_size: number;
  timestamp: string;
}

function toEntity(r: Row): Usage {
  return {
    id: r.id,
    sessionId: r.session_id ?? undefined,
    messageId: r.message_id ?? undefined,
    model: r.model,
    inputTokens: r.input_tokens,
    outputTokens: r.output_tokens,
    totalTokens: r.total_tokens,
    reasoningTokens: r.reasoning_tokens,
    cachedInputTokens: r.cached_input_tokens,
    cacheWriteTokens: r.cache_write_tokens,
    costUSD: r.cost_usd,
    inputCostUSD: r.input_cost_usd,
    outputCostUSD: r.output_cost_usd,
    durationMs: r.duration_ms,
    contextSize: r.context_size,
    timestamp: new Date(r.timestamp),
  };
}

export class SqliteUsageRepository extends IUsageRepository {
  constructor(private readonly db: Database) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db
      .query('SELECT * FROM usage ORDER BY timestamp ASC LIMIT ? OFFSET ?')
      .all(limit, offset) as Row[];
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Usage>> {
    const row = this.db.query('SELECT * FROM usage WHERE id = ?').get(id) as Row | null;
    return row ? toEntity(row) : null;
  }

  async findBySlug(): Promise<Nullable<Usage>> {
    return null;
  }

  async findBySessionId(sessionId: string): Promise<Usage[]> {
    const rows = this.db
      .query('SELECT * FROM usage WHERE session_id = ? ORDER BY timestamp ASC')
      .all(sessionId) as Row[];
    return rows.map(toEntity);
  }

  async create(entity: Usage): Promise<Usage> {
    return this.upsert(entity);
  }

  async update(entity: Usage): Promise<Usage> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const res = this.db.run('DELETE FROM usage WHERE id = ?', [id]);
    return res.changes > 0;
  }

  private upsert(u: Usage): Usage {
    this.db.run(
      `INSERT OR REPLACE INTO usage (
        id, session_id, message_id, model,
        input_tokens, output_tokens, total_tokens, reasoning_tokens,
        cached_input_tokens, cache_write_tokens,
        cost_usd, input_cost_usd, output_cost_usd, duration_ms, context_size, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        u.id,
        u.sessionId ?? null,
        u.messageId ?? null,
        u.model,
        u.inputTokens,
        u.outputTokens,
        u.totalTokens,
        u.reasoningTokens,
        u.cachedInputTokens,
        u.cacheWriteTokens,
        u.costUSD,
        u.inputCostUSD,
        u.outputCostUSD,
        u.durationMs,
        u.contextSize,
        u.timestamp.toISOString(),
      ],
    );
    return u;
  }
}
