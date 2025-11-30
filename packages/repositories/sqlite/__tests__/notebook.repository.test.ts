import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import type { Notebook, Project } from '@qwery/domain/entities';

import { NotebookRepository } from '../src/notebook.repository';
import { ProjectRepository } from '../src/project.repository';

describe('NotebookRepository', () => {
  let repository: NotebookRepository;
  let projectRepository: ProjectRepository;
  let testDbPath: string;
  let testProjectId: string;

  beforeEach(async () => {
    testDbPath = join(
      tmpdir(),
      `test-notebooks-${Date.now()}-${Math.random().toString(36).substring(7)}.db`,
    );
    repository = new NotebookRepository(testDbPath);
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

  const createTestNotebook = (overrides?: Partial<Notebook>): Notebook => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      projectId: testProjectId,
      title: 'Test Notebook',
      slug: repository.shortenId(id),
      version: 1,
      datasources: [],
      cells: [
        {
          cellId: 1,
          cellType: 'code',
          datasources: [],
          isActive: true,
          runMode: 'manual',
        },
      ],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new notebook', async () => {
      const notebook = createTestNotebook();
      const result = await repository.create(notebook);

      expect(result.id).toBe(notebook.id);
      expect(result.title).toBe(notebook.title);
      expect(result.slug).toBe(repository.shortenId(notebook.id));
    });

    it('should automatically generate slug from id', async () => {
      const notebook = createTestNotebook({
        slug: 'should-be-overridden',
      });
      const result = await repository.create(notebook);

      expect(result.slug).toBe(repository.shortenId(notebook.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should throw error when creating duplicate notebook', async () => {
      const notebook = createTestNotebook();
      await repository.create(notebook);

      await expect(repository.create(notebook)).rejects.toThrow(
        'already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find a notebook by id', async () => {
      const notebook = createTestNotebook();
      await repository.create(notebook);

      const result = await repository.findById(notebook.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(notebook.id);
      expect(result?.title).toBe(notebook.title);
      expect(result?.slug).toBe(repository.shortenId(notebook.id));
    });

    it('should return null when notebook not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find a notebook by slug', async () => {
      const notebook = createTestNotebook();
      await repository.create(notebook);

      const result = await repository.findBySlug(notebook.slug);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(notebook.id);
      expect(result?.title).toBe(notebook.title);
    });

    it('should return null when notebook not found by slug', async () => {
      const result = await repository.findBySlug('non-existent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('should return null when no notebooks exist for project', async () => {
      const result = await repository.findByProjectId(testProjectId);

      expect(result).toBeNull();
    });

    it('should return all notebooks for a project', async () => {
      const projectId = testProjectId;

      const notebook1 = createTestNotebook({
        id: '550e8400-e29b-41d4-a716-446655440000',
        projectId,
        title: 'Notebook 1',
      });
      const notebook2 = createTestNotebook({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        projectId,
        title: 'Notebook 2',
      });

      await repository.create(notebook1);
      await repository.create(notebook2);

      const result = await repository.findByProjectId(projectId);

      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
    });
  });

  describe('update', () => {
    it('should update an existing notebook and increment version', async () => {
      const notebook = createTestNotebook();
      await repository.create(notebook);

      const updated = {
        ...notebook,
        title: 'Updated Title',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
      };

      const result = await repository.update(updated);

      expect(result.title).toBe('Updated Title');
      expect(result.version).toBe(2);
      expect(result.slug).toBe(repository.shortenId(notebook.id));
    });

    it('should save previous version when updating', async () => {
      const notebook = createTestNotebook();
      await repository.create(notebook);

      const updated = {
        ...notebook,
        title: 'Updated Title',
      };

      await repository.update(updated);

      // Version should be incremented
      const found = await repository.findById(notebook.id);
      expect(found?.version).toBe(2);
    });

    it('should throw error when updating non-existent notebook', async () => {
      const notebook = createTestNotebook({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      await expect(repository.update(notebook)).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('should delete a notebook by id', async () => {
      const notebook = createTestNotebook();
      await repository.create(notebook);

      const result = await repository.delete(notebook.id);

      expect(result).toBe(true);

      const found = await repository.findById(notebook.id);
      expect(found).toBeNull();
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const notebook = createTestNotebook();

      const created = await repository.create(notebook);
      expect(created.id).toBe(notebook.id);

      const found = await repository.findById(notebook.id);
      expect(found?.id).toBe(notebook.id);

      const updated = {
        ...notebook,
        title: 'Updated',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.title).toBe('Updated');
      expect(updatedResult.version).toBe(2);

      const deleted = await repository.delete(notebook.id);
      expect(deleted).toBe(true);

      const foundAfterDelete = await repository.findById(notebook.id);
      expect(foundAfterDelete).toBeNull();
    });
  });
});
