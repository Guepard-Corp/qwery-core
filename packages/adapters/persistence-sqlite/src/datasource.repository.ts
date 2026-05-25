import {
  type Datasource,
  IDatasourceRepository,
  type ISecretVault,
  type Nullable,
  type RepositoryFindOptions,
} from '@qwery/domain';
import { desc, eq } from 'drizzle-orm';
import type { DrizzleDb } from './db';
import { datasources } from './schema';

type Row = typeof datasources.$inferSelect;

function toEntity(r: Row): Datasource {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    slug: r.slug,
    datasource_provider: r.datasourceProvider,
    datasource_driver: r.datasourceDriver,
    config: JSON.parse(r.config) as Datasource['config'],
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

function toRow(d: Datasource) {
  return {
    id: d.id,
    name: d.name,
    description: d.description,
    slug: d.slug,
    datasourceProvider: d.datasource_provider,
    datasourceDriver: d.datasource_driver,
    config: JSON.stringify(d.config),
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export class SqliteDatasourceRepository extends IDatasourceRepository {
  constructor(
    private readonly db: DrizzleDb,
    private readonly vault: ISecretVault,
  ) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Datasource[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db
      .select()
      .from(datasources)
      .orderBy(desc(datasources.updatedAt))
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Datasource>> {
    const row = this.db.select().from(datasources).where(eq(datasources.id, id)).get();
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Nullable<Datasource>> {
    const row = this.db.select().from(datasources).where(eq(datasources.slug, slug)).limit(1).get();
    return row ? toEntity(row) : null;
  }

  async create(entity: Datasource): Promise<Datasource> {
    return this.upsert(entity);
  }

  async update(entity: Datasource): Promise<Datasource> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = this.db
      .delete(datasources)
      .where(eq(datasources.id, id))
      .returning({ id: datasources.id })
      .all();
    return deleted.length > 0;
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
    const row = toRow(d);
    const { id: _id, ...rest } = row;
    this.db.insert(datasources).values(row).onConflictDoUpdate({ target: datasources.id, set: rest }).run();
    return d;
  }
}
