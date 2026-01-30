import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export class ProjectRepository extends IProjectRepository {
  async search(
    query: string,
    options?: RepositoryFindOptions & { organizationId?: string },
  ): Promise<Project[]> {
    const params = new URLSearchParams();
    params.set('q', query);
    if (options?.organizationId) params.set('orgId', options.organizationId);
    if (options?.limit) params.set('limit', String(options.limit));
    if (options?.offset) params.set('offset', String(options.offset));

    const result = await apiGet<{ results: Project[] }>(
      `/projects/search?${params.toString()}`,
      false,
    );
    return result?.results || [];
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Project[]> {
    const result = await apiGet<Project[]>('/projects', false);
    return result || [];
  }

  async findAllByOrganizationId(orgId: string): Promise<Project[]> {
    const result = await apiGet<Project[]>(`/projects?orgId=${orgId}`, false);
    return result || [];
  }

  async findById(id: string): Promise<Project | null> {
    return apiGet<Project>(`/projects/${id}`, true);
  }

  async findBySlug(slug: string): Promise<Project | null> {
    return apiGet<Project>(`/projects/${slug}`, true);
  }

  async create(entity: Project): Promise<Project> {
    return apiPost<Project>('/projects', entity);
  }

  async update(entity: Project): Promise<Project> {
    return apiPut<Project>(`/projects/${entity.id}`, entity);
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/projects/${id}`);
  }
}
