import { v4 as uuidv4 } from 'uuid';
import { type Datasource, DatasourceKind } from '@qwery/domain/entities';
import { RepositoryFindOptions } from '@qwery/domain/common';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'datasource';

type Row = Record<string, unknown>;

function serialize(datasource: Datasource): Row {
  return {
    id: datasource.id,
    slug: datasource.slug,
    name: datasource.name,
    description: datasource.description,
    projectId: datasource.projectId,
    datasource_provider: datasource.datasource_provider,
    datasource_driver: datasource.datasource_driver,
    datasource_kind: datasource.datasource_kind,
    config: datasource.config,
    createdAt: datasource.createdAt.toISOString(),
    updatedAt: datasource.updatedAt.toISOString(),
    createdBy: datasource.createdBy,
    updatedBy: datasource.updatedBy,
    isPublic: datasource.isPublic ?? false,
    remixedFrom: datasource.remixedFrom ?? undefined,
  };
}

function deserialize(row: Row): Datasource {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: row.description as string,
    projectId: row.projectId as string,
    datasource_provider: row.datasource_provider as string,
    datasource_driver: row.datasource_driver as string,
    datasource_kind:
      (row.datasource_kind as DatasourceKind) ?? DatasourceKind.EMBEDDED,
    config: (row.config as Record<string, unknown>) ?? {},
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    createdBy: row.createdBy as string,
    updatedBy: row.updatedBy as string,
    isPublic: (row.isPublic as boolean) ?? false,
    remixedFrom: (row.remixedFrom as string | null | undefined) ?? undefined,
  };
}

/**
 * File backend does not encrypt secrets; config is stored and returned as-is.
 */
export class DatasourceRepository extends IDatasourceRepository {
  async revealSecrets(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return { ...config };
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Datasource[]> {
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    return items;
  }

  async findById(id: string): Promise<Datasource | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<Datasource | null> {
    const all = await this.findAll();
    return all.find((d) => d.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string): Promise<Datasource[] | null> {
    const all = await this.findAll();
    const filtered = all.filter((d) => d.projectId === projectId);
    return filtered.length > 0 ? filtered : null;
  }

  async create(entity: Datasource): Promise<Datasource> {
    const now = new Date();
    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
    };
    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };
    await Storage.write([ENTITY, entityWithSlug.id], serialize(entityWithSlug));
    return entityWithSlug;
  }

  async update(entity: Datasource): Promise<Datasource> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Datasource with id ${entity.id} not found`);
    }
    const updated = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
      updatedBy: entity.updatedBy,
      slug: this.shortenId(entity.id),
    };
    await Storage.write([ENTITY, entity.id], serialize(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    await Storage.remove([ENTITY, id]);
    return true;
  }
}
