import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { Datasource, Project } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';

import { DatasourceRepository } from '../src/datasource.repository';
import { ProjectRepository } from '../src/project.repository';

describe('DatasourceRepository', () => {
  let repository: DatasourceRepository;
  let projectRepository: ProjectRepository;
  let testDbPath: string;
  let testProjectId: string;

  beforeEach(async () => {
    testDbPath = join(
      tmpdir(),
      `test-datasources-${Date.now()}-${Math.random().toString(36).substring(7)}.db`,
    );
    repository = new DatasourceRepository(testDbPath);
    projectRepository = new ProjectRepository(testDbPath);

    // Create a test project for foreign key constraints
    testProjectId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const testProject: Project = {
      id: testProjectId,
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Project',
      slug: projectRepository.shortenId(testProjectId),
      description: 'Test Description',
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    };
    await projectRepository.create(testProject);
  });

  afterEach(async () => {
    await repository.close();
    await projectRepository.close();
    try {
      unlinkSync(testDbPath);
    } catch {
      // File might not exist, ignore
    }
  });

  const createTestDatasource = (
    overrides?: Partial<Datasource>,
  ): Datasource => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      projectId: testProjectId,
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

      expect(result).not.toBeNull();
      expect(result?.id).toBe(datasource.id);
      expect(result?.name).toBe(datasource.name);
      expect(result?.slug).toBe(repository.shortenId(datasource.id));
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when datasource not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find a datasource by slug', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const result = await repository.findBySlug(datasource.slug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(datasource.id);
      expect(result?.name).toBe(datasource.name);
      expect(result?.slug).toBe(datasource.slug);
    });

    it('should return null when datasource not found by slug', async () => {
      const result = await repository.findBySlug('non-existent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return null when no datasources exist for project', async () => {
      const result = await repository.findByProjectId(testProjectId);

      expect(result).toBeNull();
    });

    it('should return all datasources for a project', async () => {
      const projectId1 = testProjectId;
      const projectId2 = '7ba7b810-9dad-11d1-80b4-00c04fd430c8';

      // Create a second project for this test
      const testProject2: Project = {
        id: projectId2,
        org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Test Project 2',
        slug: projectRepository.shortenId(projectId2),
        description: 'Test Description',
        status: 'active',
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        createdBy: 'test-user',
        updatedBy: 'test-user',
      };
      await projectRepository.create(testProject2);

      const datasource1 = createTestDatasource({
        id: '550e8400-e29b-41d4-a716-446655440000',
        projectId: projectId1,
        name: 'Datasource 1',
      });
      const datasource2 = createTestDatasource({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        projectId: projectId1,
        name: 'Datasource 2',
      });
      const datasource3 = createTestDatasource({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        projectId: projectId2,
        name: 'Datasource 3',
      });

      await repository.create(datasource1);
      await repository.create(datasource2);
      await repository.create(datasource3);

      const result = await repository.findByProjectId(projectId1);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result?.find((d) => d.id === datasource1.id)).toMatchObject({
        id: datasource1.id,
        name: datasource1.name,
        projectId: projectId1,
      });
      expect(result?.find((d) => d.id === datasource2.id)).toMatchObject({
        id: datasource2.id,
        name: datasource2.name,
        projectId: projectId1,
      });
      expect(result?.find((d) => d.id === datasource3.id)).toBeUndefined();
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

    it('should throw error when updating non-existent datasource', async () => {
      const datasource = createTestDatasource({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      await expect(repository.update(datasource)).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('should delete a datasource by id', async () => {
      const datasource = createTestDatasource();
      await repository.create(datasource);

      const result = await repository.delete(datasource.id);

      expect(result).toBe(true);

      const found = await repository.findById(datasource.id);
      expect(found).toBeNull();
    });

    it('should return false when datasource does not exist', async () => {
      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const datasource = createTestDatasource();

      const created = await repository.create(datasource);
      expect(created.id).toBe(datasource.id);

      const found = await repository.findById(datasource.id);
      expect(found?.id).toBe(datasource.id);

      const updated = {
        ...datasource,
        name: 'Updated',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.name).toBe('Updated');

      const deleted = await repository.delete(datasource.id);
      expect(deleted).toBe(true);

      const foundAfterDelete = await repository.findById(datasource.id);
      expect(foundAfterDelete).toBeNull();
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

      expect(found?.config).toEqual(complexConfig);
    });
  });
});
