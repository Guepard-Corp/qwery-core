import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { Project } from '@qwery/domain/entities';

import { ProjectRepository } from '../src/project.respository';

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  const testDbName = 'test-projects';

  beforeEach(async () => {
    repository = new ProjectRepository(testDbName);
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    repository = new ProjectRepository(testDbName);
  });

  afterEach(async () => {
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  });

  const createTestProject = (overrides?: Partial<Project>): Project => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      org_id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Project',
      slug: repository.shortenId(id),
      description: 'Test Description',
      region: 'us-east-1',
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new project', async () => {
      const project = createTestProject();
      const result = await repository.create(project);

      expect(result.id).toBe(project.id);
      expect(result.name).toBe(project.name);
      expect(result.slug).toBe(repository.shortenId(project.id));
      expect(result.slug.length).toBeGreaterThanOrEqual(8);
    });

    it('should automatically generate slug from id', async () => {
      const project = createTestProject({
        slug: 'should-be-overridden',
      });
      const result = await repository.create(project);

      expect(result.slug).toBe(repository.shortenId(project.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should throw error when creating duplicate project', async () => {
      const project = createTestProject();
      await repository.create(project);

      await expect(repository.create(project)).rejects.toThrow(
        'already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find a project by id', async () => {
      const project = createTestProject();
      await repository.create(project);

      const result = await repository.findById(project.id);

      expect(result.id).toBe(project.id);
      expect(result.name).toBe(project.name);
      expect(result.slug).toBe(repository.shortenId(project.id));
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should throw error when project not found', async () => {
      await expect(repository.findById('non-existent-id')).rejects.toThrow(
        'not found',
      );
    });
  });

  describe('findAll', () => {
    it('should return empty array when no projects exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all projects', async () => {
      const project1 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Project 1',
      });
      const project2 = createTestProject({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Project 2',
      });

      await repository.create(project1);
      await repository.create(project2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result.find((p) => p.id === project1.id)).toMatchObject({
        id: project1.id,
        name: project1.name,
        slug: repository.shortenId(project1.id),
      });
      expect(result.find((p) => p.id === project2.id)).toMatchObject({
        id: project2.id,
        name: project2.name,
        slug: repository.shortenId(project2.id),
      });
    });

    it('should preserve date objects in results', async () => {
      const project = createTestProject();
      await repository.create(project);

      const result = await repository.findAll();

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('update', () => {
    it('should update an existing project', async () => {
      const project = createTestProject();
      await repository.create(project);

      const updated = {
        ...project,
        name: 'Updated Name',
        description: 'Updated Description',
        status: 'inactive',
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        updatedBy: 'updated-user',
      };

      const result = await repository.update(updated);

      expect(result.name).toBe('Updated Name');
      expect(result.description).toBe('Updated Description');
      expect(result.slug).toBe(repository.shortenId(project.id));
      expect(result.status).toBe('inactive');
      expect(result.updatedAt).toEqual(new Date('2024-01-02T00:00:00Z'));
      expect(result.updatedBy).toBe('updated-user');
    });

    it('should automatically regenerate slug from id on update', async () => {
      const project = createTestProject();
      await repository.create(project);

      const updated = {
        ...project,
        name: 'Updated Name',
        slug: 'should-be-overridden',
      };

      const result = await repository.update(updated);

      expect(result.slug).toBe(repository.shortenId(project.id));
      expect(result.slug).not.toBe('should-be-overridden');
    });

    it('should create a project if it does not exist (upsert behavior)', async () => {
      const project = createTestProject({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      });

      const result = await repository.update(project);

      expect(result.id).toBe(project.id);
      expect(result.slug).toBe(repository.shortenId(project.id));

      const found = await repository.findById(project.id);
      expect(found.id).toBe(project.id);
      expect(found.slug).toBe(repository.shortenId(project.id));
    });
  });

  describe('delete', () => {
    it('should delete a project by id', async () => {
      const project = createTestProject();
      await repository.create(project);

      const result = await repository.delete(project.id);

      expect(result).toBe(true);

      await expect(repository.findById(project.id)).rejects.toThrow(
        'not found',
      );
    });

    it('should return true even if project does not exist', async () => {
      const result = await repository.delete('non-existent-id');

      expect(result).toBe(true);
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const project = createTestProject();

      const created = await repository.create(project);
      expect(created.id).toBe(project.id);
      expect(created.slug).toBe(repository.shortenId(project.id));

      const found = await repository.findById(project.id);
      expect(found.id).toBe(project.id);
      expect(found.slug).toBe(repository.shortenId(project.id));

      const updated = {
        ...project,
        name: 'Updated',
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.name).toBe('Updated');
      expect(updatedResult.slug).toBe(repository.shortenId(project.id));

      const deleted = await repository.delete(project.id);
      expect(deleted).toBe(true);

      await expect(repository.findById(project.id)).rejects.toThrow(
        'not found',
      );
    });

    it('should handle multiple projects independently', async () => {
      const p1 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Project 1',
      });
      const p2 = createTestProject({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        name: 'Project 2',
      });
      const p3 = createTestProject({
        id: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
        name: 'Project 3',
      });

      await repository.create(p1);
      await repository.create(p2);
      await repository.create(p3);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);

      await repository.delete(p2.id);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((p) => p.id === p1.id)).toBeDefined();
      expect(remaining.find((p) => p.id === p3.id)).toBeDefined();
      expect(remaining.find((p) => p.id === p2.id)).toBeUndefined();
    });

    it('should preserve all project fields correctly', async () => {
      const project = createTestProject({
        org_id: '8d0f678a-8536-51ef-a55c-f18gd2g01bf8',
        name: 'Complex Project',
        description: 'A complex project description',
        region: 'eu-west-1',
        status: 'pending',
      });

      await repository.create(project);
      const found = await repository.findById(project.id);

      expect(found.org_id).toBe(project.org_id);
      expect(found.name).toBe(project.name);
      expect(found.slug).toBe(repository.shortenId(project.id));
      expect(found.description).toBe(project.description);
      expect(found.region).toBe(project.region);
      expect(found.status).toBe(project.status);
      expect(found.createdBy).toBe(project.createdBy);
      expect(found.updatedBy).toBe(project.updatedBy);
    });

    it('should handle projects with same org_id', async () => {
      const orgId = '8d0f678a-8536-51ef-a55c-f18gd2g01bf8';
      const p1 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440000',
        org_id: orgId,
        name: 'Project 1',
      });
      const p2 = createTestProject({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        org_id: orgId,
        name: 'Project 2',
      });

      await repository.create(p1);
      await repository.create(p2);

      const all = await repository.findAll();
      expect(all).toHaveLength(2);
      expect(all.every((p) => p.org_id === orgId)).toBe(true);
      expect(all.find((p) => p.id === p1.id)?.slug).toBe(
        repository.shortenId(p1.id),
      );
      expect(all.find((p) => p.id === p2.id)?.slug).toBe(
        repository.shortenId(p2.id),
      );
    });
  });
});
