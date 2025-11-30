import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Organization } from '@qwery/domain/entities';
import { IOrganizationRepository } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class OrganizationRepository extends IOrganizationRepository {
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

  private serialize(organization: Organization): Record<string, unknown> {
    console.log('organization', JSON.stringify(organization, null, 2));
    return {
      ...organization,
      created_at: organization.createdAt.toISOString(),
      updated_at: organization.updatedAt.toISOString(),
      is_owner: organization.is_owner ? 1 : 0,
      created_by: organization.createdBy,
      updated_by: organization.updatedBy,
    };
  }

  private deserialize(row: Record<string, unknown>): Organization {
    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      is_owner: Boolean(row.is_owner),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Organization;
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Organization[]> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM organizations');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Organization | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM organizations WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM organizations WHERE slug = ?');
    const row = stmt.get(slug) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async create(entity: Organization): Promise<Organization> {
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
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      INSERT INTO organizations (id, slug, name, is_owner, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.slug,
        serialized.name,
        serialized.is_owner,
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
        throw new Error(
          `Organization with id ${entityWithId.id} already exists`,
        );
      }
      throw new Error(
        `Failed to create organization: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Organization): Promise<Organization> {
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
      UPDATE organizations 
      SET slug = ?, name = ?, is_owner = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.slug,
      serialized.name,
      serialized.is_owner,
      serialized.updated_at,
      serialized.updated_by,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Organization with id ${entity.id} not found`);
    }

    return entityWithSlug;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM organizations WHERE id = ?');
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
