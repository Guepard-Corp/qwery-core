import { IProjectRepository, type Nullable, type Project, type RepositoryFindOptions } from '@qwery/domain';
import { and, desc, eq } from 'drizzle-orm';
import type { DrizzleDb } from './db';
import { projectDatasources, projects } from './schema';

type Row = typeof projects.$inferSelect;

function toEntity(r: Row): Project {
  return {
    id: r.id,
    slug: r.slug,
    path: r.path,
    name: r.name,
    createdAt: new Date(r.createdAt),
    updatedAt: new Date(r.updatedAt),
  };
}

function toRow(p: Project) {
  return {
    id: p.id,
    slug: p.slug,
    path: p.path,
    name: p.name,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

export class SqliteProjectRepository extends IProjectRepository {
  constructor(private readonly db: DrizzleDb) {
    super();
  }

  async findAll(options?: RepositoryFindOptions): Promise<Project[]> {
    const limit = options?.limit ?? -1;
    const offset = options?.offset ?? 0;
    const rows = this.db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .limit(limit)
      .offset(offset)
      .all();
    return rows.map(toEntity);
  }

  async findById(id: string): Promise<Nullable<Project>> {
    const row = this.db.select().from(projects).where(eq(projects.id, id)).get();
    return row ? toEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Nullable<Project>> {
    const row = this.db.select().from(projects).where(eq(projects.slug, slug)).limit(1).get();
    return row ? toEntity(row) : null;
  }

  async create(entity: Project): Promise<Project> {
    return this.upsert(entity);
  }

  async update(entity: Project): Promise<Project> {
    return this.upsert(entity);
  }

  async delete(id: string): Promise<boolean> {
    this.db.delete(projectDatasources).where(eq(projectDatasources.projectId, id)).run();
    const deleted = this.db.delete(projects).where(eq(projects.id, id)).returning({ id: projects.id }).all();
    return deleted.length > 0;
  }

  async attachDatasource(projectId: string, datasourceId: string): Promise<void> {
    this.db
      .insert(projectDatasources)
      .values({ projectId, datasourceId, createdAt: new Date().toISOString() })
      .onConflictDoNothing()
      .run();
  }

  async detachDatasource(projectId: string, datasourceId: string): Promise<void> {
    this.db
      .delete(projectDatasources)
      .where(
        and(eq(projectDatasources.projectId, projectId), eq(projectDatasources.datasourceId, datasourceId)),
      )
      .run();
  }

  async listDatasourceIds(projectId: string): Promise<string[]> {
    const rows = this.db
      .select({ id: projectDatasources.datasourceId })
      .from(projectDatasources)
      .where(eq(projectDatasources.projectId, projectId))
      .all();
    return rows.map((r) => r.id);
  }

  async findByDatasourceId(datasourceId: string): Promise<Project[]> {
    const rows = this.db
      .select({ p: projects })
      .from(projects)
      .innerJoin(projectDatasources, eq(projects.id, projectDatasources.projectId))
      .where(eq(projectDatasources.datasourceId, datasourceId))
      .orderBy(desc(projects.updatedAt))
      .all();
    return rows.map((r) => toEntity(r.p));
  }

  private upsert(p: Project): Project {
    const row = toRow(p);
    const { id: _id, ...rest } = row;
    this.db.insert(projects).values(row).onConflictDoUpdate({ target: projects.id, set: rest }).run();
    return p;
  }
}
