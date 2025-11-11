import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

import { DatasourceRepository } from '../src/datasource.respository';

describe('DatasourceRepository', () => {
  let repository: DatasourceRepository;
  const testDbName = 'test-datasources';

  beforeEach(async () => {
    repository = new DatasourceRepository(testDbName);
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    repository = new DatasourceRepository(testDbName);
  });

  afterEach(async () => {
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  });

  const createTestDatasource = (
    overrides?: Partial<Datasource>,
  ): Datasource => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      projectId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Datasource',
      slug: repository.shortenId(id),
      description: 'Test Description',
      datasource_provider: 'postgres',
      datasource_driver: 'pg',
      datasource_kind: DatasourceKind.REMOTE,
      config: { host: 'localhost', port: 5432 },
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new datasource', async () => {
      const datasource = createTestDatasource();
      const result = await repository.create(datasource);

      expect(result.id).toBe(datasource.id);
      expect(result.name).toBe(datasource.name);
      expect(result.slug).toBe(repository.shortenId(datasource.id));
      expect(result.slug.length).toBeGreaterThanOrEqual(8);
    });

    it('should automatically generate slug from id', async () => {
      const datasource = createTestDatasource({
        slug: 'should-be-overridden',
      });
      const result = await repository.create(datasource);

      expect(result.slug).toBe(repository.shortenId(datasource.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should throw error when creating duplicate datasource', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      await expect(repository.create(datasource)).rejects.toThrow(
        'already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find a datasource by id', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const result = await repository.findById(datasource.id);

      expect(result.id).toBe(datasource.id);
      expect(result.name).toBe(datasource.name);
      expect(result.slug).toBe(repository.shortenId(datasource.id));
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when datasource not found', async () => {
      await expect(repository.findById('non-existent-id')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return empty array when no datasources exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all datasources', async () => {
      const datasource1 = createTestDatasource({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Datasource 1',
      });
      const datasource2 = createTestDatasource({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Datasource 2',
      });

      await repository.create(datasource1);
      await repository.create(datasource2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result.find((d) => d.id === datasource1.id)).toMatchObject({
        id: datasource1.id,
        name: datasource1.name,
        slug: repository.shortenId(datasource1.id),
      });
      expect(result.find((d) => d.id === datasource2.id)).toMatchObject({
        id: datasource2.id,
        name: datasource2.name,
        slug: repository.shortenId(datasource2.id),
      });
    });

    it('should preserve date objects in results', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const result = await repository.findAll();

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update an existing datasource', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const updated = {
        ...datasource,
        name: 'Updated Name',
        description: 'Updated Description',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        updatedBy: 'updated-user',
      };

      const result = await repository.update(updated);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(result.slug).toBe(repository.shortenId(datasource.id));
      expect(result.updatedAt).toEqual(new Date('2024-01-02T00:00:00Z'));
      expect(result.updatedBy).toBe('updated-user');
    });

    it('should automatically regenerate slug from id on update', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const updated = {
        ...datasource,
        name: 'Updated Name',
        slug: 'should-be-overridden',
      };

      const result = await repository.update(updated);

      expect(result.slug).toBe(repository.shortenId(datasource.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should create a datasource if it does not exist (upsert behavior)', async () => {
      const datasource = createTestDatasource({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      const result = await repository.update(datasource);

      expect(result.id).toBe(datasource.id);
      expect(result.slug).toBe(repository.shortenId(datasource.id));

      const found = await repository.findById(datasource.id);
      expect(found.id).toBe(datasource.id);
      expect(found.slug).toBe(repository.shortenId(datasource.id));
    });
  });

  describe('delete', () => {
    it('should delete a datasource by id', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const result = await repository.delete(datasource.id);

      expect(result).toBe(true);

      await expect(repository.findById(datasource.id)).rejects.toThrow(
        'not found',
      );
    });

    it('should return true even if datasource does not exist', async () => {
      const result = await repository.delete('non-existent-id');

      expect(result).toBe(true);
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const datasource = createTestDatasource();

      const created = await repository.create(datasource);
      expect(created.id).toBe(datasource.id);
      expect(created.slug).toBe(repository.shortenId(datasource.id));

      const found = await repository.findById(datasource.id);
      expect(found.id).toBe(datasource.id);
      expect(found.slug).toBe(repository.shortenId(datasource.id));

      const updated = {
        ...datasource,
        name: 'Updated',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.name).toBe('Updated');
      expect(updatedResult.slug).toBe(repository.shortenId(datasource.id));

      const deleted = await repository.delete(datasource.id);
      expect(deleted).toBe(true);

      await expect(repository.findById(datasource.id)).rejects.toThrow(
        'not found',
      );
    });

    it('should handle multiple datasources independently', async () => {
      const ds1 = createTestDatasource({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'DS1',
      });
      const ds2 = createTestDatasource({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'DS2',
      });
      const ds3 = createTestDatasource({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        name: 'DS3',
      });

      await repository.create(ds1);
      await repository.create(ds2);
      await repository.create(ds3);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);

      await repository.delete(ds2.id);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((d) => d.id === ds1.id)).toBeDefined();
      expect(remaining.find((d) => d.id === ds3.id)).toBeDefined();
      expect(remaining.find((d) => d.id === ds2.id)).toBeUndefined();
    });

    it('should preserve complex config objects', async () => {
      const complexConfig = {
        host: 'localhost',
        port: 5432,
        database: 'testdb',
        ssl: true,
        nested: {
          key: 'value',
          array: [1, 2, 3],
        },
      };

      const datasource = createTestDatasource({
        config: complexConfig,
      });

      await repository.create(datasource);
      const found = await repository.findById(datasource.id);

      expect(found.config).toEqual(complexConfig);
    });
  });
});
