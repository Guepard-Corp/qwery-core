import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { Project } from '@qwery/domain/entities';

import { ProjectRepository } from '../src/project.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function projectFilePath(id: string): string {
  return path.join(getStorageDir(), 'project', `${id}.json`);
}

async function assertProjectFileExists(id: string): Promise<void> {
  const filePath = projectFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

async function assertProjectFileContent(
  id: string,
  expected: Record<string, unknown>,
): Promise<void> {
  const filePath = projectFilePath(id);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  expect(parsed.id).toBe(expected.id);
  expect(parsed.name).toBe(expected.name);
}

describe('ProjectRepository', () => {
  let repository: ProjectRepository;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-file-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new ProjectRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestProject = (overrides?: Partial<Project>): Project => {
    const id = overrides?.id ?? '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      organizationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: 'Test Project',
      slug: repository.shortenId(id),
      description: 'Test Description',
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new project and persist file on disk', async () => {
      const project = createTestProject();
      const result = await repository.create(project);

      expect(result.id).toBe(project.id);
      expect(result.name).toBe(project.name);
      expect(result.slug).toBe(repository.shortenId(project.id));
      expect(result.slug.length).toBeGreaterThanOrEqual(8);

      await assertProjectFileExists(result.id);
      await assertProjectFileContent(result.id, {
        id: result.id,
        name: result.name,
      });
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

      expect(result).not.toBeNull();
      expect(result?.id).toBe(project.id);
      expect(result?.name).toBe(project.name);
      expect(result?.slug).toBe(repository.shortenId(project.id));
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when project not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should find a project by slug', async () => {
      const project = createTestProject();
      await repository.create(project);

      const result = await repository.findBySlug(
        repository.shortenId(project.id),
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe(project.id);
      expect(result?.slug).toBe(repository.shortenId(project.id));
    });

    it('should return null when slug not found', async () => {
      const result = await repository.findBySlug('nonexistent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findAllByOrganizationId', () => {
    it('should return projects for organization', async () => {
      const orgId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const project1 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: orgId,
      });
      const project2 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440002',
        organizationId: orgId,
      });
      await repository.create(project1);
      await repository.create(project2);

      const result = await repository.findAllByOrganizationId(orgId);

      expect(result).toHaveLength(2);
      expect(result.map((p) => p.id).sort()).toEqual(
        [project1.id, project2.id].sort(),
      );
    });
  });

  describe('search', () => {
    it('should filter by query and optionally by organizationId', async () => {
      const orgId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
      const project1 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440001',
        organizationId: orgId,
        name: 'Alpha Project',
      });
      const project2 = createTestProject({
        id: '550e8400-e29b-41d4-a716-446655440002',
        organizationId: orgId,
        name: 'Beta Project',
      });
      await repository.create(project1);
      await repository.create(project2);

      const byQuery = await repository.search('alpha');
      expect(byQuery).toHaveLength(1);
      expect(byQuery[0]?.name).toBe('Alpha Project');

      const byOrg = await repository.search('', { organizationId: orgId });
      expect(byOrg).toHaveLength(2);

      const paginated = await repository.search('project', {
        offset: 0,
        limit: 1,
      });
      expect(paginated).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('should update a project and persist slug on disk', async () => {
      const project = createTestProject();
      await repository.create(project);
      const updated = {
        ...project,
        name: 'Updated Name',
        updatedAt: new Date(),
        updatedBy: 'other-user',
      };

      const result = await repository.update(updated);

      expect(result.name).toBe('Updated Name');
      expect(result.slug).toBe(repository.shortenId(project.id));
      const found = await repository.findById(project.id);
      expect(found?.name).toBe('Updated Name');
      await assertProjectFileContent(project.id, {
        id: project.id,
        name: 'Updated Name',
      });
    });

    it('should throw when project not found', async () => {
      const project = createTestProject();
      await expect(
        repository.update({ ...project, id: 'non-existent-id' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('should delete a project and remove file from disk', async () => {
      const project = createTestProject();
      await repository.create(project);
      await assertProjectFileExists(project.id);

      const result = await repository.delete(project.id);

      expect(result).toBe(true);
      await expect(fs.stat(projectFilePath(project.id))).rejects.toThrow();
      const found = await repository.findById(project.id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent project', async () => {
      const result = await repository.delete('non-existent-id');
      expect(result).toBe(false);
    });
  });
});
