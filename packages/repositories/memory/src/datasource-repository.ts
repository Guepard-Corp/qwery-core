import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Datasource } from '@qwery/domain/entities';
import { DatasourceRepositoryPort } from '@qwery/domain/repositories';

export class DatasourceRepository extends DatasourceRepositoryPort {
  private datasources = new Map<string, Datasource>();

  async findAll(options?: RepositoryFindOptions): Promise<Datasource[]> {
    const allDatasources = Array.from(this.datasources.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allDatasources.slice(offset, offset + limit);
    }
    return allDatasources.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Datasource>> {
    return this.datasources.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<Datasource>> {
    const datasources = Array.from(this.datasources.values());
    return datasources.find((datasource) => datasource.slug === slug) ?? null;
  }

  async create(entity: Datasource): Promise<Datasource> {
    this.datasources.set(entity.id, entity);
    return entity;
  }

  async update(entity: Datasource): Promise<Datasource> {
    if (!this.datasources.has(entity.id)) {
      throw new Error(`Datasource with id ${entity.id} not found`);
    }
    this.datasources.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.datasources.delete(id);
  }
}
