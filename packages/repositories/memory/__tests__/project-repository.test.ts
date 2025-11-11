import { beforeEach, describe, expect, it } from 'vitest';

import type { Project } from '@qwery/domain/entities';

import { ProjectRepository } from '../src/project-repository';

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
  const validUuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const orgId = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

  beforeEach(() => {
    repository = new ProjectRepository();
  });

  describe('create', () => {
    it('should create a project', async () => {
      const project: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const result = await repository.create(project);

      expect(result).toEqual(project);
      expect(result.name).toBe('Test Project');
      expect(result.slug).toBe('test-project');
    });
  });

  describe('findById', () => {
    it('should find project by id', async () => {
      const project: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(project);
      const found = await repository.findById(validUuid1);

      expect(found).toEqual(project);
    });

    it('should return null when project not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find project by slug', async () => {
      const project: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(project);
      const found = await repository.findBySlug('test-project');

      expect(found).toEqual(project);
      expect(found?.slug).toBe('test-project');
    });

    it('should return null when slug not found', async () => {
      const found = await repository.findBySlug('nonexistent-slug');
      expect(found).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return empty array when no projects exist', async () => {
      const projects = await repository.findAll();
      expect(projects).toEqual([]);
    });

    it('should return all projects', async () => {
      const project1: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Project 1',
        slug: 'project-1',
        description: 'First project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      const project2: Project = {
        id: validUuid2,
        org_id: orgId,
        name: 'Project 2',
        slug: 'project-2',
        description: 'Second project',
        region: 'us-west-2',
        status: 'inactive',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user2',
        updatedBy: 'user2',
      };

      await repository.create(project1);
      await repository.create(project2);

      const projects = await repository.findAll();
      expect(projects).toHaveLength(2);
      expect(projects).toContainEqual(project1);
      expect(projects).toContainEqual(project2);
    });

    it('should support pagination with limit', async () => {
      for (let i = 0; i < 5; i++) {
        const project: Project = {
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
          org_id: orgId,
          name: `Project ${i}`,
          slug: `project-${i}`,
          description: `Description ${i}`,
          region: 'us-east-1',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: 'user1',
          updatedBy: 'user1',
        };
        await repository.create(project);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update an existing project', async () => {
      const project: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(project);

      const updatedProject: Project = {
        ...project,
        name: 'Updated Project',
        status: 'inactive',
        updatedBy: 'user2',
      };

      const result = await repository.update(updatedProject);

      expect(result.name).toBe('Updated Project');
      expect(result.status).toBe('inactive');
      expect(result.updatedBy).toBe('user2');

      const found = await repository.findById(validUuid1);
      expect(found?.name).toBe('Updated Project');
    });

    it('should throw error when updating non-existent project', async () => {
      const project: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await expect(repository.update(project)).rejects.toThrow(
        `Project with id ${validUuid1} not found`,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing project', async () => {
      const project: Project = {
        id: validUuid1,
        org_id: orgId,
        name: 'Test Project',
        slug: 'test-project',
        description: 'A test project',
        region: 'us-east-1',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user1',
        updatedBy: 'user1',
      };

      await repository.create(project);
      const result = await repository.delete(validUuid1);

      expect(result).toBe(true);

      const found = await repository.findById(validUuid1);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const result = await repository.delete('nonexistent-id');
      expect(result).toBe(false);
    });
  });
});
