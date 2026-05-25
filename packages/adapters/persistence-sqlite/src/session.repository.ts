import { ISessionRepository, type Nullable, type RepositoryFindOptions, type Session } from '@qwery/domain';
import { desc, eq, sql } from 'drizzle-orm';
import type { DrizzleDb } from './db';
import { sessions } from './schema';

type Row = typeof sessions.$inferSelect;

function toEntity(r: Row): Session {
  return {
    id: r.id,
    projectId: r.projectId ?? undefined,
    title: r.title,
    seedMessage: r.seedMessage ?? undefined,
    slug: r.slug,
    datasources: JSON.parse(r.datasources) as string[],
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

function toRow(s: Session) {
  return {
    id: s.id,
    projectId: s.projectId ?? null,
    title: s.title,
    seedMessage: s.seedMessage ?? null,
    slug: s.slug,
    datasources: JSON.stringify(s.datasources),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export class SqliteSessionRepository extends ISessionRepository {
  constructor(private readonly db: DrizzleDb) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Session[]> {
    const limit = options?.limit ?? -1; // SQLite: negative limit = no limit
    const offset = options?.offset ?? 0;
    const rows = this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.updatedAt))
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Session>> {
    const row = this.db.select().from(sessions).where(eq(sessions.id, id)).get();
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Nullable<Session>> {
    const row = this.db.select().from(sessions).where(eq(sessions.slug, slug)).limit(1).get();
    return row ? toEntity(row) : null;
  }

  async findByDatasourceId(datasourceId: string): Promise<Session[]> {
    // Membership test against the JSON-array `datasources` column; json_each has
    // no Drizzle builder equivalent, so it stays as a parameterized expression.
    const rows = this.db
      .select()
      .from(sessions)
      .where(
        sql`EXISTS (SELECT 1 FROM json_each(${sessions.datasources}) je WHERE je.value = ${datasourceId})`,
      )
      .orderBy(desc(sessions.updatedAt))
      .all();
    return rows.map(toEntity);
  }

  async findByProjectId(projectId: string): Promise<Session[]> {
    const rows = this.db
      .select()
      .from(sessions)
      .where(eq(sessions.projectId, projectId))
      .orderBy(desc(sessions.updatedAt))
      .all();
    return rows.map(toEntity);
  }

  async create(entity: Session): Promise<Session> {
    return this.upsert(entity);
  }

  async update(entity: Session): Promise<Session> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.db.delete(sessions).where(eq(sessions.id, id)).returning({ id: sessions.id }).all();
    return deleted.length > 0;
  }

  private upsert(s: Session): Session {
    const row = toRow(s);
    const { id: _id, ...rest } = row;
    this.db.insert(sessions).values(row).onConflictDoUpdate({ target: sessions.id, set: rest }).run();
    return s;
  }
}
