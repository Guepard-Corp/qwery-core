import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../src/exceptions';
import type { Datasource } from '../../../src/entities/datasource.type';
import { DatasourceKind } from '../../../src/entities/datasource.type';
import { IDatasourceRepository } from '../../../src/repositories/datasource-repository.port';
import { DeleteDatasourceService } from '../../../src/services/datasources/delete-datasource.usecase';

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

describe('DeleteDatasourceService', () => {
  const createTestDatasource = (): Datasource => ({
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
  });

  it('should delete datasource when found', async () => {
    const repository = new MockDatasourceRepository();
    const service = new DeleteDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute(datasource.id);

    expect(result).toBe(true);
    expect(await repository.findById(datasource.id)).toBeNull();
  });

  it('should throw DomainException when datasource not found', async () => {
    const repository = new MockDatasourceRepository();
    const service = new DeleteDatasourceService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Datasource with id 'nonexistent-id' not found",
    );
  });

  it('should return true when deletion succeeds', async () => {
    const repository = new MockDatasourceRepository();
    const service = new DeleteDatasourceService(repository);

    const datasource = createTestDatasource();
    await repository.create(datasource);

    const result = await service.execute(datasource.id);

    expect(result).toBe(true);
  });

  it('should not delete other datasources', async () => {
    const repository = new MockDatasourceRepository();
    const service = new DeleteDatasourceService(repository);

    const datasource1 = createTestDatasource();
    const datasource2: Datasource = {
      ...createTestDatasource(),
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Another Datasource',
    };

    await repository.create(datasource1);
    await repository.create(datasource2);

    await service.execute(datasource1.id);

    expect(await repository.findById(datasource1.id)).toBeNull();
    expect(await repository.findById(datasource2.id)).toBeDefined();
  });
});
