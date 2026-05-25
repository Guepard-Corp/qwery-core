import type { Database } from 'bun:sqlite';
import {
  IMessageRepository,
  type Message,
  type MessageContent,
  type MessageMetadata,
  type MessageRole,
  type Nullable,
  type PaginatedResult,
  type PaginationOptions,
  type RepositoryFindOptions,
} from '@qwery/domain';

interface Row {
  id: string;
  session_id: string;
  role: string;
  content: string;
  metadata: string;
  created_at: string;
  updated_at: string;
}

function toEntity(r: Row): Message {
  return {
    id: r.id,
    sessionId: r.session_id,
    role: r.role as MessageRole,
    content: JSON.parse(r.content) as MessageContent,
    metadata: JSON.parse(r.metadata) as MessageMetadata,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export class SqliteMessageRepository extends IMessageRepository {
  constructor(private readonly db: Database) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db
      .query('SELECT * FROM messages ORDER BY created_at ASC LIMIT ? OFFSET ?')
      .all(limit, offset) as Row[];
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Message>> {
    const row = this.db.query('SELECT * FROM messages WHERE id = ?').get(id) as Row | null;
    return row ? toEntity(row) : null;
  }

  async findBySlug(): Promise<Nullable<Message>> {
    return null;
  }

  async findBySessionId(sessionId: string): Promise<Message[]> {
    const rows = this.db
      .query('SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as Row[];
    return rows.map(toEntity);
  }

  async findBySessionIdPaginated(
    sessionId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    // Page backwards from `cursor` (an ISO timestamp). ISO-8601 UTC strings sort
    // lexicographically in chronological order, so a string compare is correct.
    const params: (string | number)[] = [sessionId];
    let where = 'session_id = ?';
    if (options.cursor) {
      where += ' AND created_at < ?';
      params.push(options.cursor);
    }
    params.push(options.limit + 1); // fetch one extra to detect `hasMore`
    const rows = this.db
      .query(`SELECT * FROM messages WHERE ${where} ORDER BY created_at DESC LIMIT ?`)
      .all(...params) as Row[];

    const hasMore = rows.length > options.limit;
    const page = rows.slice(0, options.limit).map(toEntity).reverse();
    const nextCursor = page.length > 0 && page[0] ? page[0].createdAt.toISOString() : null;
    return { messages: page, nextCursor, hasMore };
  }

  async create(entity: Message): Promise<Message> {
    return this.upsert(entity);
  }

  async update(entity: Message): Promise<Message> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const res = this.db.run('DELETE FROM messages WHERE id = ?', [id]);
    return res.changes > 0;
  }

  private upsert(m: Message): Message {
    this.db.run(
      `INSERT OR REPLACE INTO messages (id, session_id, role, content, metadata, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        m.id,
        m.sessionId,
        m.role,
        JSON.stringify(m.content),
        JSON.stringify(m.metadata ?? {}),
        m.createdAt.toISOString(),
        m.updatedAt.toISOString(),
      ],
    );
    return m;
  }
}
