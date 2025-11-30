import { describe, expect, it } from 'vitest';
import type { Datasource } from '../../../src/entities/datasource.type';
import { DatasourceKind } from '../../../src/entities/datasource.type';
import { IDatasourceRepository } from '../../../src/repositories/datasource-repository.port';
import { GetDatasourcesByProjectIdService } from '../../../src/services/datasources/get-datasources-by-project-id.usecase';

class MockDatasourceRepository implements IDatasourceRepository {
  private datasources = new Map<string, Datasource>();

  async findAll() {
    return Array.from(this.datasources.values());
  }

  async findById(id: string) {
    return this.datasources.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    const datasources = Array.from(this.datasources.values());
    return datasources.find((d) => d.slug === slug) ?? null;
  }

  async findByProjectId(projectId: string) {
    const datasources = Array.from(this.datasources.values());
    const filtered = datasources.filter((d) => d.projectId === projectId);
    return filtered.length > 0 ? filtered : null;
  }

  async create(entity: Datasource) {
    this.datasources.set(entity.id, entity);
    return entity;
  }

  async update(entity: Datasource) {
    if (!this.datasources.has(entity.id)) {
      throw new Error(`Datasource with id ${entity.id} not found`);
    }
    this.datasources.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.datasources.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('GetDatasourcesByProjectIdService', () => {
  it('should return empty array when no datasources exist for project', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourcesByProjectIdService(repository);

    const result = await service.execute(
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    );

    expect(result).toBeDefined();
    expect(result).toEqual([]);
  });

  it('should return all datasources for a project', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourcesByProjectIdService(repository);

    const projectId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const otherProjectId = '7ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const datasource1: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId,
      name: 'Test Datasource 1',
      description: 'Test description 1',
      slug: 'test-datasource-1',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgres',
      datasource_kind: DatasourceKind.REMOTE,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      updatedBy: 'user1',
    };

    const datasource2: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      projectId,
      name: 'Test Datasource 2',
      description: 'Test description 2',
      slug: 'test-datasource-2',
      datasource_provider: 'mysql',
      datasource_driver: 'mysql',
      datasource_kind: DatasourceKind.REMOTE,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      updatedBy: 'user1',
    };

    const datasource3: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      projectId: otherProjectId,
      name: 'Other Project Datasource',
      description: 'Other description',
      slug: 'other-datasource',
      datasource_provider: 'sqlite',
      datasource_driver: 'sqlite',
      datasource_kind: DatasourceKind.EMBEDDED,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      updatedBy: 'user1',
    };

    await repository.create(datasource1);
    await repository.create(datasource2);
    await repository.create(datasource3);

    const result = await service.execute(projectId);

    expect(result).toBeDefined();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe(datasource1.id);
    expect(result[1].id).toBe(datasource2.id);
    expect(result.some((d) => d.id === datasource3.id)).toBe(false);
  });

  it('should return datasources with all properties', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourcesByProjectIdService(repository);

    const projectId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const datasource: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId,
      name: 'Test Datasource',
      description: 'Test description',
      slug: 'test-datasource',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgres',
      datasource_kind: DatasourceKind.EMBEDDED,
      config: { host: 'localhost', port: 5432 },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: 'user2',
    };

    await repository.create(datasource);

    const result = await service.execute(projectId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(datasource.id);
    expect(result[0].name).toBe(datasource.name);
    expect(result[0].description).toBe(datasource.description);
    expect(result[0].slug).toBe(datasource.slug);
    expect(result[0].datasource_provider).toBe(datasource.datasource_provider);
    expect(result[0].datasource_driver).toBe(datasource.datasource_driver);
    expect(result[0].datasource_kind).toBe(datasource.datasource_kind);
    expect(result[0].config).toEqual(datasource.config);
    expect(result[0].createdBy).toBe(datasource.createdBy);
    expect(result[0].updatedBy).toBe(datasource.updatedBy);
  });
});
