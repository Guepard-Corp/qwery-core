import { v4 as uuidv4 } from 'uuid';
import type Database from 'better-sqlite3';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository, ISecretVault } from '@qwery/domain/repositories';
import { getSecretFields } from '@qwery/domain/utils';
import { getDiscoveredDatasource } from '@qwery/extensions-sdk';

import { createDatabase, initializeSchema } from './db';
import { LocalEncryptionVault } from './local-encryption-vault';

export class DatasourceRepository extends IDatasourceRepository {
  private db: Database.Database;
  private initPromise: Promise<void> | null = null;
  private vault: ISecretVault;
  private secretFieldsCache: Map<string, string[]> = new Map();

  constructor(private dbPath?: string) {
    super();
    this.db = createDatabase(dbPath);
    const encryptionKey =
      process.env.ENCRYPTION_KEY || 'default-fallback-key-change-this';
    this.vault = new LocalEncryptionVault(encryptionKey);
    this.init();
  }

  private async getSecretFieldsForProvider(provider: string): Promise<string[]> {
    if (this.secretFieldsCache.has(provider)) {
      return this.secretFieldsCache.get(provider)!;
    }

    try {
      const extension = await getDiscoveredDatasource(provider);
      if (extension) {
        const fields = getSecretFields(extension.schema);
        this.secretFieldsCache.set(provider, fields);
        return fields;
      }
    } catch (error) {
      console.warn(`Could not load schema for provider ${provider}:`, error);
    }
    return [];
  }

  private async protectConfig(
    provider: string,
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const secrets = await this.getSecretFieldsForProvider(provider);
    if (secrets.length === 0) return config;

    const protectedConfig = { ...config };
    for (const field of secrets) {
      const value = protectedConfig[field];
      if (
        typeof value === 'string' &&
        value &&
        !this.vault.isProtected(value)
      ) {
        protectedConfig[field] = await this.vault.protect(value, {
          keyName: field,
        });
      }
    }
    return protectedConfig;
  }

  private async revealConfig(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const revealedConfig = { ...config };
    for (const key in revealedConfig) {
      const value = revealedConfig[key];
      if (typeof value === 'string' && this.vault.isProtected(value)) {
        revealedConfig[key] = await this.vault.reveal(value);
      }
    }
    return revealedConfig;
  }

  private async init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = Promise.resolve(initializeSchema(this.db));
    return this.initPromise;
  }

  private ensureDate(value: unknown): Date {
    if (value instanceof Date) {
      return value;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      const parsed = new Date(value);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  }

  private serialize(datasource: Datasource): Record<string, unknown> {
    const createdAt = this.ensureDate(datasource.createdAt);
    const updatedAt = this.ensureDate(datasource.updatedAt);

    return {
      ...datasource,
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      project_id: datasource.projectId,
      datasource_provider: datasource.datasource_provider,
      datasource_driver: datasource.datasource_driver,
      datasource_kind: datasource.datasource_kind,
      datasource_config: JSON.stringify(datasource.config),
      created_by: datasource.createdBy,
      updated_by: datasource.updatedBy,
    };
  }

  public async revealSecrets(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const revealedConfig = { ...config };
    for (const key in revealedConfig) {
      const value = revealedConfig[key];
      if (typeof value === 'string' && this.vault.isProtected(value)) {
        revealedConfig[key] = await this.vault.reveal(value);
      }
    }
    return revealedConfig;
  }

  private async deserialize(row: Record<string, unknown>): Promise<Datasource> {
    const config = JSON.parse(row.datasource_config as string);

    return {
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      description: row.description as string,
      projectId: row.project_id as string,
      datasource_provider: row.datasource_provider as string,
      datasource_driver: row.datasource_driver as string,
      datasource_kind: row.datasource_kind as string,
      config: config,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string,
    } as Datasource;
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Datasource[]> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM datasources');
    const rows = stmt.all() as Record<string, unknown>[];
    return Promise.all(rows.map((row) => this.deserialize(row)));
  }

  async findById(id: string): Promise<Datasource | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM datasources WHERE id = ?');
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findBySlug(slug: string): Promise<Datasource | null> {
    await this.init();
    const stmt = this.db.prepare('SELECT * FROM datasources WHERE slug = ?');
    const row = stmt.get(slug) as Record<string, unknown> | undefined;
    return row ? this.deserialize(row) : null;
  }

  async findByProjectId(projectId: string): Promise<Datasource[] | null> {
    await this.init();
    const stmt = this.db.prepare(
      'SELECT * FROM datasources WHERE project_id = ?',
    );
    const rows = stmt.all(projectId) as Record<string, unknown>[];
    return rows.length > 0
      ? Promise.all(rows.map((row) => this.deserialize(row)))
      : null;
  }

  async create(entity: Datasource): Promise<Datasource> {
    await this.init();

    const now = new Date();
    const userId = 'system';

    const protectedConfig = await this.protectConfig(
      entity.datasource_provider,
      entity.config,
    );

    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      config: protectedConfig,
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
      INSERT INTO datasources (id, slug, name, description, project_id, datasource_provider, datasource_driver, datasource_kind, datasource_config, created_at, updated_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        serialized.id,
        serialized.slug,
        serialized.name,
        serialized.description,
        serialized.project_id,
        serialized.datasource_provider,
        serialized.datasource_driver,
        serialized.datasource_kind,
        serialized.datasource_config,
        serialized.created_at,
        serialized.updated_at,
        serialized.created_by,
        serialized.updated_by,
      );
      return {
        ...entityWithSlug,
      };
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('UNIQUE constraint') ||
          error.message.includes('already exists'))
      ) {
        throw new Error(`Datasource with id ${entityWithId.id} already exists`);
      }
      throw new Error(
        `Failed to create datasource: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async update(entity: Datasource): Promise<Datasource> {
    await this.init();

    const userId = 'system';

    const protectedConfig = await this.protectConfig(
      entity.datasource_provider,
      entity.config,
    );

    const entityWithSlug = {
      ...entity,
      config: protectedConfig,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy || userId,
      slug: this.shortenId(entity.id),
    };

    const serialized = this.serialize(entityWithSlug);
    const stmt = this.db.prepare(`
      UPDATE datasources 
      SET slug = ?, name = ?, description = ?, datasource_provider = ?, datasource_driver = ?, datasource_kind = ?, datasource_config = ?, updated_at = ?, updated_by = ?
      WHERE id = ?
    `);

    const result = stmt.run(
      serialized.slug,
      serialized.name,
      serialized.description,
      serialized.datasource_provider,
      serialized.datasource_driver,
      serialized.datasource_kind,
      serialized.datasource_config,
      serialized.updated_at,
      serialized.updated_by,
      serialized.id,
    );

    if (result.changes === 0) {
      throw new Error(`Datasource with id ${entity.id} not found`);
    }

    return {
      ...entityWithSlug,
    };
  }

  async delete(id: string): Promise<boolean> {
    await this.init();
    const stmt = this.db.prepare('DELETE FROM datasources WHERE id = ?');
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
