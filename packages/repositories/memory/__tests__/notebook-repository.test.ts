import { beforeEach, describe, expect, it } from 'vitest';

import type { Notebook } from '@qwery/domain/entities';

import { NotebookRepository } from '../src/notebook-repository';

describe('NotebookRepository', () => {
  let repository: NotebookRepository;
  const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
  const validUuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const projectId1 = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
  const projectId2 = '8d0f678a-8536-51ef-a55c-f18gd2g01bf8';

  beforeEach(() => {
    repository = new NotebookRepository();
  });

  describe('create', () => {
    it('should create a notebook', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1', 'ds2'],
        cells: [
          {
            query: 'SELECT * FROM users',
            cellType: 'query',
            cellId: 1,
            datasources: ['ds1'],
            isActive: true,
            runMode: 'default',
          },
        ],
      };

      const result = await repository.create(notebook);

      expect(result).toEqual(notebook);
      expect(result.name).toBe('Test Notebook');
      expect(result.slug).toBe('test-notebook');
    });
  });

  describe('findById', () => {
    it('should find notebook by id', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await repository.create(notebook);
      const found = await repository.findById(validUuid1);

      expect(found).toEqual(notebook);
    });

    it('should return null when notebook not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find notebook by slug', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await repository.create(notebook);
      const found = await repository.findBySlug('test-notebook');

      expect(found).toEqual(notebook);
      expect(found?.slug).toBe('test-notebook');
    });

    it('should return null when slug not found', async () => {
      const found = await repository.findBySlug('nonexistent-slug');
      expect(found).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should find notebook by project id', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await repository.create(notebook);
      const found = await repository.findByProjectId(projectId1);

      expect(found).toEqual(notebook);
      expect(found?.projectId).toBe(projectId1);
    });

    it('should return null when project id not found', async () => {
      const found = await repository.findByProjectId('nonexistent-project-id');
      expect(found).toBeNull();
    });

    it('should return first notebook when multiple notebooks exist for same project', async () => {
      const notebook1: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Notebook 1',
        title: 'Notebook 1 Title',
        description: 'First notebook',
        slug: 'notebook-1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      const notebook2: Notebook = {
        id: validUuid2,
        projectId: projectId1,
        name: 'Notebook 2',
        title: 'Notebook 2 Title',
        description: 'Second notebook',
        slug: 'notebook-2',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await repository.create(notebook1);
      await repository.create(notebook2);

      const found = await repository.findByProjectId(projectId1);
      expect(found).toBeDefined();
      expect(found?.projectId).toBe(projectId1);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no notebooks exist', async () => {
      const notebooks = await repository.findAll();
      expect(notebooks).toEqual([]);
    });

    it('should return all notebooks', async () => {
      const notebook1: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Notebook 1',
        title: 'Notebook 1 Title',
        description: 'First notebook',
        slug: 'notebook-1',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      const notebook2: Notebook = {
        id: validUuid2,
        projectId: projectId2,
        name: 'Notebook 2',
        title: 'Notebook 2 Title',
        description: 'Second notebook',
        slug: 'notebook-2',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds2'],
        cells: [],
      };

      await repository.create(notebook1);
      await repository.create(notebook2);

      const notebooks = await repository.findAll();
      expect(notebooks).toHaveLength(2);
      expect(notebooks).toContainEqual(notebook1);
      expect(notebooks).toContainEqual(notebook2);
    });

    it('should support pagination with limit', async () => {
      for (let i = 0; i < 5; i++) {
        const notebook: Notebook = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          projectId: projectId1,
          name: `Notebook ${i}`,
          title: `Notebook ${i} Title`,
          description: `Description ${i}`,
          slug: `notebook-${i}`,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          datasources: [],
          cells: [],
        };
        await repository.create(notebook);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update an existing notebook', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await repository.create(notebook);

      const updatedNotebook: Notebook = {
        ...notebook,
        name: 'Updated Notebook',
        version: 2,
        cells: [
          {
            query: 'SELECT * FROM products',
            cellType: 'query',
            cellId: 1,
            datasources: ['ds1'],
            isActive: true,
            runMode: 'default',
          },
        ],
      };

      const result = await repository.update(updatedNotebook);

      expect(result.name).toBe('Updated Notebook');
      expect(result.version).toBe(2);
      expect(result.cells).toHaveLength(1);

      const found = await repository.findById(validUuid1);
      expect(found?.name).toBe('Updated Notebook');
    });

    it('should throw error when updating non-existent notebook', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await expect(repository.update(notebook)).rejects.toThrow(
        `Notebook with id ${validUuid1} not found`,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing notebook', async () => {
      const notebook: Notebook = {
        id: validUuid1,
        projectId: projectId1,
        name: 'Test Notebook',
        title: 'Test Notebook Title',
        description: 'A test notebook',
        slug: 'test-notebook',
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        datasources: ['ds1'],
        cells: [],
      };

      await repository.create(notebook);
      const result = await repository.delete(validUuid1);

      expect(result).toBe(true);

      const found = await repository.findById(validUuid1);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent notebook', async () => {
      const result = await repository.delete('nonexistent-id');
      expect(result).toBe(false);
    });
  });
});
