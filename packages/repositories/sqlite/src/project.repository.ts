import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class ProjectRepository extends IProjectRepository {
  private db: Database.Database;
  private initPromise: Promise<void> | null = null;

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

  private serialize(project: Project): Record<string, unknown> {
    return {
      ...project,
      created_at: project.createdAt.toISOString(),
      updated_at: project.updatedAt.toISOString(),
      organization_id: project.organizationId,
      created_by: project.createdBy,
      updated_by: project.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Project {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      organizationId: row.organization_id as string,
      description: row.description as string,
      status: row.status as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Project;
  }

  async search(
    query: string,
    options?: RepositoryFindOptions & { organizationId?: string },
  ): Promise<Project[]> {
    const q = query.trim().toLowerCase();
    const all = await this.findAll();
    const scoped = options?.organizationId
      ? all.filter((p) => p.organizationId === options.organizationId)
      : all;

    const filtered = q
      ? scoped.filter((project) => {
          const name = project.name?.toLowerCase() ?? '';
          const slug = project.slug?.toLowerCase() ?? '';
          const description = project.description?.toLowerCase() ?? '';
          return (
            name.includes(q) || slug.includes(q) || description.includes(q)
          );
        })
      : scoped;

    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit
      ? filtered.slice(offset, offset + limit)
      : filtered.slice(offset);
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Project[]> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM projects');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Project | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM projects WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(slug: string): Promise<Project | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM projects WHERE slug = ?');
    const row = stmt.get(slug) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findAllByOrganizationId(orgId: string): Promise<Project[]> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM projects WHERE organization_id = ?',
    );
    const rows = stmt.all(orgId) as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async create(entity: Project): Promise<Project> {
    await this.init();

    const now = new Date();
    const userId = 'system';

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: entity.createdBy || userId,
      updatedBy: entity.updatedBy || userId,
      status: entity.status || 'active',
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      INSERT INTO projects (id, slug, name, organization_id, description, status, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.slug,
        serialized.name,
        serialized.organization_id,
        serialized.description,
        serialized.status,
        serialized.created_at,
        serialized.updated_at,
        serialized.created_by,
        serialized.updated_by,
      );
      return entityWithSlug;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(`Project with id ${entityWithId.id} already exists`);
      }
      throw new Error(
        `Failed to create project: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Project): Promise<Project> {
    await this.init();

    const userId = 'system';
    const entityWithSlug = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy || userId,
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      UPDATE projects 
      SET slug = ?, name = ?, description = ?, status = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.slug,
      serialized.name,
      serialized.description,
      serialized.status,
      serialized.updated_at,
      serialized.updated_by,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Project with id ${entity.id} not found`);
    }

    return entityWithSlug;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  async close(): Promise<void> {
    this.db.close();
  }

  public shortenId(id: string): string {
    return super.shortenId(id);
  }
}
