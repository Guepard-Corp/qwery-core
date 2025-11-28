import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import type { Notebook } from '@qwery/domain/entities';
import { NotebookRepositoryPort } from '@qwery/domain/repositories';

import { createDatabase, initializeSchema } from './db';

export class NotebookRepository extends NotebookRepositoryPort {
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

  private serialize(notebook: Notebook): Record<string, unknown> {
    return {
      ...notebook,
      description: notebook.description ?? null,
      created_at: notebook.createdAt.toISOString(),
      updated_at: notebook.updatedAt.toISOString(),
      project_id: notebook.projectId,
      datasources: JSON.stringify(notebook.datasources),
      cells: JSON.stringify(notebook.cells),
    };
  }

  private deserialize(row: Record<string, unknown>): Notebook {
    const rawDescription = row.description;
    const normalizedDescription =
      typeof rawDescription === 'string' && rawDescription.trim().length > 0
        ? (rawDescription as string)
        : undefined;

    return {
      id: row.id as string,
      slug: row.slug as string,
      title: row.title as string,
      description: normalizedDescription,
      projectId: row.project_id as string,
      datasources: JSON.parse(row.datasources as string) as string[],
      cells: JSON.parse(row.cells as string),
      version: (row.version as number) || 1,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    } as Notebook;
  }

  async findAll(): Promise<Notebook[]> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM notebooks');
    const rows = stmt.all() as Record<string, unknown>[];
    return rows.map((row) => this.deserialize(row));
  }

  async findById(id: string): Promise<Notebook | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM notebooks WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(slug: string): Promise<Notebook | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM notebooks WHERE slug = ?');
    const row = stmt.get(slug) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findByProjectId(projectId: string): Promise<Notebook[] | null> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM notebooks WHERE project_id = ?',
    );
    const rows = stmt.all(projectId) as Record<string, unknown>[];
    return rows.length > 0 ? rows.map((row) => this.deserialize(row)) : null;
  }

  async create(entity: Notebook): Promise<Notebook> {
    await this.init();

    const now = new Date();

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      version: entity.version || 1,
    };

    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      INSERT INTO notebooks (id, slug, title, description, project_id, datasources, cells, version, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.slug,
        serialized.title,
        serialized.description,
        serialized.project_id,
        serialized.datasources,
        serialized.cells,
        serialized.version,
        serialized.created_at,
        serialized.updated_at,
      );
      return entityWithSlug;
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(`Notebook with id ${entityWithId.id} already exists`);
      }
      throw new Error(
        `Failed to create notebook: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Notebook): Promise<Notebook> {
    await this.init();

    // First, fetch the current version to save it
    const currentNotebook = await this.findById(entity.id);
    if (!currentNotebook) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }

    // Save current version to versions store
    const versionId = `${currentNotebook.id}-${currentNotebook.version}`;
    const versionStmt = this.db.prepare(`
      INSERT OR REPLACE INTO notebook_versions (version_id, notebook_id, version, data, saved_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    versionStmt.run(
      versionId,
      currentNotebook.id,
      currentNotebook.version,
      JSON.stringify(this.serialize(currentNotebook)),
      new Date().toISOString(),
    );

    // Increment version and update timestamp
    const updatedEntity: Notebook = {
      ...entity,
      createdAt: currentNotebook.createdAt, // preserve original creation date
      version: currentNotebook.version + 1,
      updatedAt: new Date(),
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(updatedEntity);
    const stmt = this.db.prepare(`
      UPDATE notebooks 
      SET slug = ?, title = ?, description = ?, datasources = ?, cells = ?, version = ?, updated_at = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.slug,
      serialized.title,
      serialized.description ?? null,
      serialized.datasources,
      serialized.cells,
      serialized.version,
      serialized.updated_at,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Notebook with id ${entity.id} not found`);
    }

    return updatedEntity;
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM notebooks WHERE id = ?');
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
