import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Datasource } from '../../../src/entities/datasource.type';
import { DatasourceKind } from '../../../src/entities/datasource.type';
import { IDatasourceRepository } from '../../../src/repositories/datasource-repository.port';
import { UpdateDatasourceService } from '../../../src/services/datasources/update-datasource.usecase';

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

describe('UpdateDatasourceService', () => {
  const createTestDatasource = (): Datasource => ({
    id: '550e8400-e29b-41d4-a716-446655440000',
    projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    name: 'Original Name',
    description: 'Original description',
    slug: 'original-slug',
    datasource_provider: 'postgresql',
    datasource_driver: 'postgres',
    datasource_kind: DatasourceKind.REMOTE,
    config: {},
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    createdBy: 'user1',
    updatedBy: 'user1',
  });

  it('should update datasource name', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
    expect(result.description).toBe(datasource.description);
    expect(result.updatedAt.getTime()).toBeGreaterThan(
      datasource.updatedAt.getTime(),
    );
  });

  it('should update datasource description', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      description: 'Updated description',
    });

    expect(result.description).toBe('Updated description');
    expect(result.name).toBe(datasource.name);
  });

  it('should update datasource config', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const newConfig = { host: 'localhost', port: 5432, database: 'testdb' };
    const result = await service.execute({
      id: datasource.id,
      config: newConfig,
    });

    expect(result.config).toEqual(newConfig);
  });

  it('should update datasource kind', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      datasource_kind: DatasourceKind.EMBEDDED,
    });

    expect(result.datasource_kind).toBe(DatasourceKind.EMBEDDED);
  });

  it('should update datasource provider', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      datasource_provider: 'mysql',
    });

    expect(result.datasource_provider).toBe('mysql');
  });

  it('should update datasource driver', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      datasource_driver: 'mysql2',
    });

    expect(result.datasource_driver).toBe('mysql2');
  });

  it('should update multiple fields at once', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      name: 'New Name',
      description: 'New description',
      config: { host: 'localhost' },
    });

    expect(result.name).toBe('New Name');
    expect(result.description).toBe('New description');
    expect(result.config).toEqual({ host: 'localhost' });
  });

  it('should throw DomainException when datasource not found', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    await expect(
      service.execute({
        id: 'nonexistent-id',
        name: 'New Name',
      }),
    ).rejects.toThrow(DomainException);
    await expect(
      service.execute({
        id: 'nonexistent-id',
        name: 'New Name',
      }),
    ).rejects.toThrow("Datasource with id 'nonexistent-id' not found");
  });

  it('should preserve existing fields when updating partial data', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource: Datasource = {
      ...createTestDatasource(),
      config: { host: 'existing-host' },
    };
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      name: 'Updated Name',
    });

    expect(result.name).toBe('Updated Name');
    expect(result.config).toEqual({ host: 'existing-host' });
    expect(result.projectId).toBe(datasource.projectId);
  });

  it('should update updatedAt timestamp', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    const originalUpdatedAt = datasource.updatedAt;
    await repository.create(datasource);

    // Wait a bit to ensure timestamp difference
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = await service.execute({
      id: datasource.id,
      name: 'Updated Name',
    });

    expect(result.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });

  it('should update updatedBy when provided', async () => {
    const repository = new MockDatasourceRepository();
    const service = new UpdateDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute({
      id: datasource.id,
      name: 'Updated Name',
      updatedBy: 'user2',
    });

    expect(result.updatedBy).toBe('user2');
  });
});
