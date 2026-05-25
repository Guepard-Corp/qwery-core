import type { Database } from 'bun:sqlite';
import { ISessionRepository, type Nullable, type RepositoryFindOptions, type Session } from '@qwery/domain';

interface Row {
  id: string;
  title: string;
  seed_message: string | null;
  slug: string;
  datasources: string;
  created_at: string;
  updated_at: string;
}

function toEntity(r: Row): Session {
  return {
    id: r.id,
    title: r.title,
    seedMessage: r.seed_message ?? undefined,
    slug: r.slug,
    datasources: JSON.parse(r.datasources) as string[],
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export class SqliteSessionRepository extends ISessionRepository {
  constructor(private readonly db: Database) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Session[]> {
    const limit = options?.limit ?? -1; // SQLite: negative limit = no limit
    const offset = options?.offset ?? 0;
    const rows = this.db
      .query('SELECT * FROM sessions ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Row[];
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Session>> {
    const row = this.db.query('SELECT * FROM sessions WHERE id = ?').get(id) as Row | null;
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Nullable<Session>> {
    const row = this.db.query('SELECT * FROM sessions WHERE slug = ? LIMIT 1').get(slug) as Row | null;
    return row ? toEntity(row) : null;
  }

  async findByDatasourceId(datasourceId: string): Promise<Session[]> {
    const rows = this.db
      .query(
        `SELECT * FROM sessions
         WHERE EXISTS (SELECT 1 FROM json_each(sessions.datasources) je WHERE je.value = ?)
         ORDER BY updated_at DESC`,
      )
      .all(datasourceId) as Row[];
    return rows.map(toEntity);
  }

  async create(entity: Session): Promise<Session> {
    return this.upsert(entity);
  }

  async update(entity: Session): Promise<Session> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const res = this.db.run('DELETE FROM sessions WHERE id = ?', [id]);
    return res.changes > 0;
  }

  private upsert(s: Session): Session {
    this.db.run(
      `INSERT OR REPLACE INTO sessions (id, title, seed_message, slug, datasources, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        s.id,
        s.title,
        s.seedMessage ?? null,
        s.slug,
        JSON.stringify(s.datasources),
        s.createdAt.toISOString(),
        s.updatedAt.toISOString(),
      ],
    );
    return s;
  }
}
