import { v4 as uuidv4 } from 'uuid';
import type { Organization } from '@qwery/domain/entities';
import { RepositoryFindOptions } from '@qwery/domain/common';
import { IOrganizationRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'organization';

type Row = Record<string, unknown>;

function serialize(organization: Organization): Row {
  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    userId: organization.userId,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    createdBy: organization.createdBy,
    updatedBy: organization.updatedBy,
  };
}

function deserialize(row: Row): Organization {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    userId: row.userId as string,
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    createdBy: row.createdBy as string,
    updatedBy: row.updatedBy as string,
  };
}

export class OrganizationRepository extends IOrganizationRepository {
  async search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]> {
    const q = query.trim().toLowerCase();
    const all = await this.findAll();
    const filtered = q
      ? all.filter((org) => {
          const name = org.name?.toLowerCase() ?? '';
          const slug = org.slug?.toLowerCase() ?? '';
          return name.includes(q) || slug.includes(q);
        })
      : all;
    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit
      ? filtered.slice(offset, offset + limit)
      : filtered.slice(offset);
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Organization[]> {
    const keys = await Storage.list([ENTITY]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    return items;
  }

  async findById(id: string): Promise<Organization | null> {
    try {
      const row = await Storage.read<Row>([ENTITY, id]);
      return deserialize(row);
    } catch {
      return null;
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const all = await this.findAll();
    return all.find((o) => o.slug === slug) ?? null;
  }

  async create(entity: Organization): Promise<Organization> {
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

  async update(entity: Organization): Promise<Organization> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Organization with id ${entity.id} not found`);
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
