import { v4 as uuidv4 } from 'uuid';
import type { Project } from '@qwery/domain/entities';
import { RepositoryFindOptions } from '@qwery/domain/common';
import { IProjectRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'project';

type Row = Record<string, unknown>;

function serialize(project: Project): Row {
  return {
    id: project.id,
    slug: project.slug,
    name: project.name,
    organizationId: project.organizationId,
    description: project.description ?? undefined,
    status: project.status ?? undefined,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    createdBy: project.createdBy,
    updatedBy: project.updatedBy,
  };
}

function deserialize(row: Row): Project {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    organizationId: row.organizationId as string,
    description: (row.description as string) ?? '',
    status: (row.status as string) ?? 'active',
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    createdBy: row.createdBy as string,
    updatedBy: row.updatedBy as string,
  };
}

export class ProjectRepository extends IProjectRepository {
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
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    return items;
  }

  async findById(id: string): Promise<Project | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<Project | null> {
    const all = await this.findAll();
    return all.find((p) => p.slug === slug) ?? null;
  }

  async findAllByOrganizationId(orgId: string): Promise<Project[]> {
    const all = await this.findAll();
    return all.filter((p) => p.organizationId === orgId);
  }

  async create(entity: Project): Promise<Project> {
    const id = entity.id || uuidv4();
    const existing = await this.findById(id);
    if (existing) {
      throw new Error(`Project with id ${id} already exists`);
    }
    const now = new Date();
    const entityWithId = {
      ...entity,
      id,
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      createdBy: entity.createdBy,
      updatedBy: entity.updatedBy,
      status: entity.status || 'active',
    };
    const entityWithSlug = {
      ...entityWithId,
      slug: this.shortenId(entityWithId.id),
    };
    await Storage.write([ENTITY, entityWithSlug.id], serialize(entityWithSlug));
    return entityWithSlug;
  }

  async update(entity: Project): Promise<Project> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Project with id ${entity.id} not found`);
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
