import type { Database } from 'bun:sqlite';
import {
  type Datasource,
  IDatasourceRepository,
  type ISecretVault,
  type Nullable,
  type RepositoryFindOptions,
} from '@qwery/domain';

interface Row {
  id: string;
  name: string;
  description: string;
  slug: string;
  datasource_provider: string;
  datasource_driver: string;
  config: string;
  created_at: string;
  updated_at: string;
}

function toEntity(r: Row): Datasource {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    slug: r.slug,
    datasource_provider: r.datasource_provider,
    datasource_driver: r.datasource_driver,
    config: JSON.parse(r.config) as Datasource['config'],
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  };
}

export class SqliteDatasourceRepository extends IDatasourceRepository {
  constructor(
    private readonly db: Database,
    private readonly vault: ISecretVault,
  ) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Datasource[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db
      .query('SELECT * FROM datasources ORDER BY updated_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset) as Row[];
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Datasource>> {
    const row = this.db.query('SELECT * FROM datasources WHERE id = ?').get(id) as Row | null;
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Nullable<Datasource>> {
    const row = this.db.query('SELECT * FROM datasources WHERE slug = ? LIMIT 1').get(slug) as Row | null;
    return row ? toEntity(row) : null;
  }

  async create(entity: Datasource): Promise<Datasource> {
    return this.upsert(entity);
  }

  async update(entity: Datasource): Promise<Datasource> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const res = this.db.run('DELETE FROM datasources WHERE id = ?', [id]);
    return res.changes > 0;
  }

  async revealSecrets(config: Record<string, unknown>): Promise<Record<string, unknown>> {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string' && this.vault.isProtected(value)) {
        out[key] = await this.vault.reveal(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  }

  private upsert(d: Datasource): Datasource {
    this.db.run(
      `INSERT OR REPLACE INTO datasources (
        id, name, description, slug, datasource_provider, datasource_driver, config, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.id,
        d.name,
        d.description,
        d.slug,
        d.datasource_provider,
        d.datasource_driver,
        JSON.stringify(d.config),
        d.createdAt.toISOString(),
        d.updatedAt.toISOString(),
      ],
    );
    return d;
  }
}
