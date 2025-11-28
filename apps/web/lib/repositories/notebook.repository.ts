import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Notebook } from '@qwery/domain/entities';
import { NotebookRepositoryPort } from '@qwery/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export class NotebookRepository extends NotebookRepositoryPort {
  async findAll(_options?: RepositoryFindOptions): Promise<Notebook[]> {
    const result = await apiGet<Notebook[]>('/notebooks', false);
    return result || [];
  }

  async findById(id: string): Promise<Notebook | null> {
    return apiGet<Notebook>(`/notebooks/${id}`, true);
  }

  async findBySlug(slug: string): Promise<Notebook | null> {
    return apiGet<Notebook>(`/notebooks/${slug}`, true);
  }

  async findByProjectId(projectId: string): Promise<Notebook[] | null> {
    const result = await apiGet<Notebook[]>(
      `/notebooks?projectId=${projectId}`,
      true,
    );
    if (!result) {
      return null;
    }
    return result.length > 0 ? result : null;
  }

  async create(entity: Notebook): Promise<Notebook> {
    return apiPost<Notebook>('/notebooks', entity);
  }

  async update(entity: Notebook): Promise<Notebook> {
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...payload } = entity;
    return apiPut<Notebook>(`/notebooks/${entity.id}`, payload);
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/notebooks/${id}`);
  }
}
