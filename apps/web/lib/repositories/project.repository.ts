import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export class ProjectRepository extends IProjectRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Project[]> {
    const result = await apiGet<Project[]>('/projects', false);
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
