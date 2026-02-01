import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { Organization } from '@qwery/domain/entities';

import { OrganizationRepository } from '../src/organization.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(id: string): string {
  return path.join(getStorageDir(), 'organization', `${id}.json`);
}

async function assertFileExists(id: string): Promise<void> {
  const filePath = entityFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('OrganizationRepository', () => {
  let repository: OrganizationRepository;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-org-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new OrganizationRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestOrg = (overrides?: Partial<Organization>): Organization => {
    const id = overrides?.id ?? '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      name: 'Test Org',
      slug: repository.shortenId(id),
      userId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('creates organization and persists file on disk', async () => {
      const org = createTestOrg();
      const result = await repository.create(org);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(org.name);
      await assertFileExists(result.id);
      const raw = await fs.readFile(entityFilePath(result.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.name).toBe(org.name);
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const org = createTestOrg();
      await repository.create(org);
      await assertFileExists(org.id);

      const result = await repository.findById(org.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(org.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates and persists to disk', async () => {
      const org = createTestOrg();
      await repository.create(org);
      const updated = await repository.update({
        ...org,
        name: 'Updated Org',
        updatedAt: new Date(),
        updatedBy: 'other',
      });
      expect(updated.name).toBe('Updated Org');
      const raw = await fs.readFile(entityFilePath(org.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.name).toBe('Updated Org');
    });

    it('throws when organization not found', async () => {
      const org = createTestOrg();
      await expect(
        repository.update({ ...org, id: 'non-existent' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const org = createTestOrg();
      await repository.create(org);
      await assertFileExists(org.id);

      const result = await repository.delete(org.id);
      expect(result).toBe(true);
      await expect(fs.stat(entityFilePath(org.id))).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('findBySlug', () => {
    it('finds by slug', async () => {
      const org = createTestOrg();
      await repository.create(org);
      const result = await repository.findBySlug(repository.shortenId(org.id));
      expect(result).not.toBeNull();
      expect(result?.id).toBe(org.id);
    });

    it('returns null when slug not found', async () => {
      const result = await repository.findBySlug('nonexistent-slug');
      expect(result).toBeNull();
    });
  });

  describe('search', () => {
    it('filters by query', async () => {
      const org = createTestOrg({ name: 'Alpha Org' });
      await repository.create(org);
      const results = await repository.search('alpha');
      expect(results).toHaveLength(1);
      expect(results[0]?.name).toBe('Alpha Org');
    });

    it('supports offset and limit', async () => {
      const org1 = createTestOrg({
        id: '550e8400-e29b-41d4-a716-446655440001',
      });
      const org2 = createTestOrg({
        id: '550e8400-e29b-41d4-a716-446655440002',
      });
      await repository.create(org1);
      await repository.create(org2);
      const page = await repository.search('', { offset: 0, limit: 1 });
      expect(page).toHaveLength(1);
      const second = await repository.search('', { offset: 1, limit: 1 });
      expect(second).toHaveLength(1);
    });
  });
});
