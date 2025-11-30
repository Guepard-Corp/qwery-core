import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Datasource } from '../../../src/entities/datasource.type';
import { DatasourceKind } from '../../../src/entities/datasource.type';
import { IDatasourceRepository } from '../../../src/repositories/datasource-repository.port';
import {
  GetDatasourceService,
  GetDatasourceBySlugService,
} from '../../../src/services/datasources/get-datasource-by-slug.usecase';

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

describe('GetDatasourceService', () => {
  it('should return datasource when found by id', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourceService(repository);

    const datasource: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Datasource',
      description: 'Test description',
      slug: 'test-datasource',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgres',
      datasource_kind: DatasourceKind.REMOTE,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      updatedBy: 'user1',
    };

    await repository.create(datasource);

    const result = await service.execute(datasource.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(datasource.id);
    expect(result.name).toBe(datasource.name);
    expect(result.description).toBe(datasource.description);
    expect(result.slug).toBe(datasource.slug);
    expect(result.projectId).toBe(datasource.projectId);
  });

  it('should throw DomainException when datasource not found by id', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourceService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Datasource with id 'nonexistent-id' not found",
    );
  });
});

describe('GetDatasourceBySlugService', () => {
  it('should return datasource when found', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourceBySlugService(repository);

    const datasource: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Datasource',
      description: 'Test description',
      slug: 'test-datasource',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgres',
      datasource_kind: DatasourceKind.REMOTE,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      updatedBy: 'user1',
    };

    await repository.create(datasource);

    const result = await service.execute(datasource.slug);

    expect(result).toBeDefined();
    expect(result.id).toBe(datasource.id);
    expect(result.name).toBe(datasource.name);
    expect(result.description).toBe(datasource.description);
    expect(result.slug).toBe(datasource.slug);
    expect(result.projectId).toBe(datasource.projectId);
  });

  it('should throw DomainException when datasource not found', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourceBySlugService(repository);

    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-slug')).rejects.toThrow(
      "Datasource with slug 'nonexistent-slug' not found",
    );
  });

  it('should return datasource with all properties', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourceBySlugService(repository);

    const datasource: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Datasource',
      description: 'Test description',
      slug: 'test-datasource',
      datasource_provider: 'postgresql',
      datasource_driver: 'postgres',
      datasource_kind: DatasourceKind.EMBEDDED,
      config: { host: 'localhost', port: 5432, database: 'testdb' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: 'user2',
    };

    await repository.create(datasource);

    const result = await service.execute(datasource.slug);

    expect(result.id).toBe(datasource.id);
    expect(result.name).toBe(datasource.name);
    expect(result.description).toBe(datasource.description);
    expect(result.slug).toBe(datasource.slug);
    expect(result.datasource_provider).toBe(datasource.datasource_provider);
    expect(result.datasource_driver).toBe(datasource.datasource_driver);
    expect(result.datasource_kind).toBe(datasource.datasource_kind);
    expect(result.config).toEqual(datasource.config);
    expect(result.createdAt).toEqual(datasource.createdAt);
    expect(result.updatedAt).toEqual(datasource.updatedAt);
    expect(result.createdBy).toBe(datasource.createdBy);
    expect(result.updatedBy).toBe(datasource.updatedBy);
  });

  it('should handle datasource with different kinds', async () => {
    const repository = new MockDatasourceRepository();
    const service = new GetDatasourceBySlugService(repository);

    const embeddedDatasource: Datasource = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Embedded Datasource',
      description: 'Embedded description',
      slug: 'embedded-datasource',
      datasource_provider: 'sqlite',
      datasource_driver: 'sqlite',
      datasource_kind: DatasourceKind.EMBEDDED,
      config: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user1',
      updatedBy: 'user1',
    };

    await repository.create(embeddedDatasource);

    const result = await service.execute(embeddedDatasource.slug);

    expect(result.datasource_kind).toBe(DatasourceKind.EMBEDDED);
    expect(result.name).toBe('Embedded Datasource');
  });
});
