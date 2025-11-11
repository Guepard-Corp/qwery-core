import { beforeEach, describe, expect, it } from 'vitest';

import type { Datasource } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

import { DatasourceRepository } from '../src/datasource-repository';

describe('DatasourceRepository', () => {
  let repository: DatasourceRepository;
  const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
  const validUuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const projectId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  beforeEach(() => {
    repository = new DatasourceRepository();
  });

  describe('create', () => {
    it('should create a datasource', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Test Datasource',
        description: 'A test datasource',
        slug: 'test-datasource',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: {
          host: 'localhost',
          port: 5432,
          database: 'testdb',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const result = await repository.create(datasource);

      expect(result).toEqual(datasource);
      expect(result.name).toBe('Test Datasource');
      expect(result.slug).toBe('test-datasource');
    });

    it('should create an embedded datasource', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Embedded Datasource',
        description: 'An embedded datasource',
        slug: 'embedded-datasource',
        datasource_provider: 'duckdb',
        datasource_driver: 'duckdb',
        datasource_kind: DatasourceKind.EMBEDDED,
        config: {
          path: '/data/db.duckdb',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const result = await repository.create(datasource);

      expect(result.datasource_kind).toBe(DatasourceKind.EMBEDDED);
    });
  });

  describe('findById', () => {
    it('should find datasource by id', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Test Datasource',
        description: 'A test datasource',
        slug: 'test-datasource',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(datasource);
      const found = await repository.findById(validUuid1);

      expect(found).toEqual(datasource);
    });

    it('should return null when datasource not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find datasource by slug', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Test Datasource',
        description: 'A test datasource',
        slug: 'test-datasource',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(datasource);
      const found = await repository.findBySlug('test-datasource');

      expect(found).toEqual(datasource);
      expect(found?.slug).toBe('test-datasource');
    });

    it('should return null when slug not found', async () => {
      const found = await repository.findBySlug('nonexistent-slug');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no datasources exist', async () => {
      const datasources = await repository.findAll();
      expect(datasources).toEqual([]);
    });

    it('should return all datasources', async () => {
      const datasource1: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Datasource 1',
        description: 'First datasource',
        slug: 'datasource-1',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const datasource2: Datasource = {
        id: validUuid2,
        projectId: projectId,
        name: 'Datasource 2',
        description: 'Second datasource',
        slug: 'datasource-2',
        datasource_provider: 'mysql',
        datasource_driver: 'mysql2',
        datasource_kind: DatasourceKind.REMOTE,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user2',
        updatedBy: 'user2',
      };

      await repository.create(datasource1);
      await repository.create(datasource2);

      const datasources = await repository.findAll();
      expect(datasources).toHaveLength(2);
      expect(datasources).toContainEqual(datasource1);
      expect(datasources).toContainEqual(datasource2);
    });

    it('should support pagination with limit', async () => {
      for (let i = 0; i < 5; i++) {
        const datasource: Datasource = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          projectId: projectId,
          name: `Datasource ${i}`,
          description: `Description ${i}`,
          slug: `datasource-${i}`,
          datasource_provider: 'postgres',
          datasource_driver: 'pg',
          datasource_kind: DatasourceKind.REMOTE,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1',
          updatedBy: 'user1',
        };
        await repository.create(datasource);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should support pagination with offset and limit', async () => {
      for (let i = 0; i < 10; i++) {
        const datasource: Datasource = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          projectId: projectId,
          name: `Datasource ${i}`,
          description: `Description ${i}`,
          slug: `datasource-${i}`,
          datasource_provider: 'postgres',
          datasource_driver: 'pg',
          datasource_kind: DatasourceKind.REMOTE,
          config: {},
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1',
          updatedBy: 'user1',
        };
        await repository.create(datasource);
      }

      const paginated = await repository.findAll({ offset: 2, limit: 3 });
      expect(paginated).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update an existing datasource', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Test Datasource',
        description: 'A test datasource',
        slug: 'test-datasource',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: { host: 'localhost' },
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(datasource);

      const updatedDatasource: Datasource = {
        ...datasource,
        name: 'Updated Datasource',
        config: { host: 'newhost' },
        updatedAt: new Date(),
        updatedBy: 'user2',
      };

      const result = await repository.update(updatedDatasource);

      expect(result.name).toBe('Updated Datasource');
      expect(result.config.host).toBe('newhost');
      expect(result.updatedBy).toBe('user2');

      const found = await repository.findById(validUuid1);
      expect(found?.name).toBe('Updated Datasource');
    });

    it('should throw error when updating non-existent datasource', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Test Datasource',
        description: 'A test datasource',
        slug: 'test-datasource',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await expect(repository.update(datasource)).rejects.toThrow(
        `Datasource with id ${validUuid1} not found`,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing datasource', async () => {
      const datasource: Datasource = {
        id: validUuid1,
        projectId: projectId,
        name: 'Test Datasource',
        description: 'A test datasource',
        slug: 'test-datasource',
        datasource_provider: 'postgres',
        datasource_driver: 'pg',
        datasource_kind: DatasourceKind.REMOTE,
        config: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(datasource);
      const result = await repository.delete(validUuid1);

      expect(result).toBe(true);

      const found = await repository.findById(validUuid1);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent datasource', async () => {
      const result = await repository.delete('nonexistent-id');
      expect(result).toBe(false);
    });
  });
});
