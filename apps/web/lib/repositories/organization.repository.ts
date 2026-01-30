import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Organization } from '@qwery/domain/entities';
import { IOrganizationRepository } from '@qwery/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export class OrganizationRepository extends IOrganizationRepository {
  async search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const result = await apiGet<{ results: Organization[] }>(
      `/organizations/search?${params.toString()}`,
      false,
    );
    return result?.results || [];
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Organization[]> {
    const result = await apiGet<Organization[]>('/organizations', false);
    return result || [];
  }

  async findById(id: string): Promise<Organization | null> {
    return apiGet<Organization>(`/organizations/${id}`, true);
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    return apiGet<Organization>(`/organizations/${slug}`, true);
  }

  async create(entity: Organization): Promise<Organization> {
    return apiPost<Organization>('/organizations', entity);
  }

  async update(entity: Organization): Promise<Organization> {
    return apiPut<Organization>(`/organizations/${entity.id}`, entity);
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/organizations/${id}`);
  }
}
