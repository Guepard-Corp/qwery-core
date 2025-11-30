import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Organization } from '@qwery/domain/entities';
import { IOrganizationRepository } from '@qwery/domain/repositories';

export class OrganizationRepository extends IOrganizationRepository {
  private organizations = new Map<string, Organization>();

  async findAll(options?: RepositoryFindOptions): Promise<Organization[]> {
    const allOrgs = Array.from(this.organizations.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allOrgs.slice(offset, offset + limit);
    }
    return allOrgs.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Organization>> {
    return this.organizations.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<Organization>> {
    const orgs = Array.from(this.organizations.values());
    return orgs.find((org) => org.slug === slug) ?? null;
  }

  async create(entity: Organization): Promise<Organization> {
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async update(entity: Organization): Promise<Organization> {
    if (!this.organizations.has(entity.id)) {
      throw new Error(`Organization with id ${entity.id} not found`);
    }
    this.organizations.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.organizations.delete(id);
  }
}
