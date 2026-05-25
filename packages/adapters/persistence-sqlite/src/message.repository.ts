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
import { and, asc, desc, eq, lt } from 'drizzle-orm';
import type { DrizzleDb } from './db';
import { messages } from './schema';

type Row = typeof messages.$inferSelect;

function toEntity(r: Row): Message {
  return {
    id: r.id,
    sessionId: r.sessionId,
    role: r.role as MessageRole,
    content: JSON.parse(r.content) as MessageContent,
    metadata: JSON.parse(r.metadata) as MessageMetadata,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

function toRow(m: Message) {
  return {
    id: m.id,
    sessionId: m.sessionId,
    role: m.role,
    content: JSON.stringify(m.content),
    metadata: JSON.stringify(m.metadata ?? {}),
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
  };
}

export class SqliteMessageRepository extends IMessageRepository {
  constructor(private readonly db: DrizzleDb) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db
      .select()
      .from(messages)
      .orderBy(asc(messages.createdAt))
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Message>> {
    const row = this.db.select().from(messages).where(eq(messages.id, id)).get();
    return row ? toEntity(row) : null;
  }

  async findBySlug(): Promise<Nullable<Message>> {
    return null;
  }

  async findBySessionId(sessionId: string): Promise<Message[]> {
    const rows = this.db
      .select()
      .from(messages)
      .where(eq(messages.sessionId, sessionId))
      .orderBy(asc(messages.createdAt))
      .all();
    return rows.map(toEntity);
  }

  async findBySessionIdPaginated(
    sessionId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    // Page backwards from `cursor` (an ISO timestamp). ISO-8601 UTC strings sort
    // lexicographically in chronological order, so a string compare is correct.
    const conditions = [eq(messages.sessionId, sessionId)];
    if (options.cursor) conditions.push(lt(messages.createdAt, options.cursor));
    const rows = this.db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(options.limit + 1) // fetch one extra to detect `hasMore`
      .all();

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
    const deleted = this.db.delete(messages).where(eq(messages.id, id)).returning({ id: messages.id }).all();
    return deleted.length > 0;
  }

  private upsert(m: Message): Message {
    const row = toRow(m);
    const { id: _id, ...rest } = row;
    this.db.insert(messages).values(row).onConflictDoUpdate({ target: messages.id, set: rest }).run();
    return m;
  }
}
