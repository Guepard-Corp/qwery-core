import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import { apiDelete, apiGet, apiPost, apiPut } from './api-client';

export class DatasourceRepository extends IDatasourceRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Datasource[]> {
    const result = await apiGet<Datasource[]>('/datasources', false);
    return result || [];
  }

  async findById(id: string): Promise<Datasource | null> {
    return apiGet<Datasource>(`/datasources/${id}`, true);
  }

  async findBySlug(slug: string): Promise<Datasource | null> {
    return apiGet<Datasource>(`/datasources/${slug}`, true);
  }

  async findByProjectId(projectId: string): Promise<Datasource[] | null> {
    const result = await apiGet<Datasource[]>(
      `/datasources?projectId=${projectId}`,
      true,
    );
    if (!result) {
      return null;
    }
    return result.length > 0 ? result : null;
  }

  async create(entity: Datasource): Promise<Datasource> {
    return apiPost<Datasource>('/datasources', entity);
  }

  async update(entity: Datasource): Promise<Datasource> {
    return apiPut<Datasource>(`/datasources/${entity.id}`, entity);
  }

  async delete(id: string): Promise<boolean> {
    return apiDelete(`/datasources/${id}`);
  }

  async revealSecrets(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    // Client-side repository does not reveal secrets.
    // Secrets are revealed on the server before execution or via specialized API.
    return config;
  }
}
