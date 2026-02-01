import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import { type Datasource, DatasourceKind } from '@qwery/domain/entities';

import { DatasourceRepository } from '../src/datasource.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(id: string): string {
  return path.join(getStorageDir(), 'datasource', `${id}.json`);
}

async function assertFileExists(id: string): Promise<void> {
  const filePath = entityFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('DatasourceRepository', () => {
  let repository: DatasourceRepository;
  let testDir: string;
  const projectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-ds-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new DatasourceRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestDatasource = (
    overrides?: Partial<Datasource>,
  ): Datasource => {
    const id = overrides?.id ?? '660e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      slug: repository.shortenId(id),
      name: 'Test Datasource',
      description: 'Desc',
      projectId,
      datasource_provider: 'test',
      datasource_driver: 'sqlite',
      datasource_kind: DatasourceKind.EMBEDDED,
      config: {},
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'user',
      updatedBy: 'user',
      isPublic: false,
      ...overrides,
    };
  };

  describe('create', () => {
    it('creates datasource and persists file on disk', async () => {
      const ds = createTestDatasource();
      const result = await repository.create(ds);

      expect(result.id).toBeDefined();
      expect(result.name).toBe(ds.name);
      await assertFileExists(result.id);
      const raw = await fs.readFile(entityFilePath(result.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.name).toBe(ds.name);
    });

    it('persists isPublic and remixedFrom for deserialize coverage', async () => {
      const ds = createTestDatasource({
        isPublic: true,
        remixedFrom: '770e8400-e29b-41d4-a716-446655440000',
      });
      const result = await repository.create(ds);
      const found = await repository.findById(result.id);
      expect(found?.isPublic).toBe(true);
      expect(found?.remixedFrom).toBe('770e8400-e29b-41d4-a716-446655440000');
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const ds = createTestDatasource();
      await repository.create(ds);
      await assertFileExists(ds.id);

      const result = await repository.findById(ds.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(ds.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('finds by slug', async () => {
      const ds = createTestDatasource();
      await repository.create(ds);
      const result = await repository.findBySlug(repository.shortenId(ds.id));
      expect(result).not.toBeNull();
      expect(result?.id).toBe(ds.id);
    });

    it('returns null when slug not found', async () => {
      const result = await repository.findBySlug('nonexistent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('returns datasources for project', async () => {
      const ds = createTestDatasource();
      await repository.create(ds);
      const result = await repository.findByProjectId(projectId);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result?.[0]?.projectId).toBe(projectId);
    });

    it('returns null when no datasources for project', async () => {
      const result = await repository.findByProjectId(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates and persists to disk', async () => {
      const ds = createTestDatasource();
      await repository.create(ds);
      const updated = await repository.update({
        ...ds,
        name: 'Updated DS',
        updatedAt: new Date(),
        updatedBy: 'other',
      });
      expect(updated.name).toBe('Updated DS');
      const raw = await fs.readFile(entityFilePath(ds.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.name).toBe('Updated DS');
    });

    it('throws when datasource not found', async () => {
      const ds = createTestDatasource();
      await expect(
        repository.update({ ...ds, id: 'non-existent' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const ds = createTestDatasource();
      await repository.create(ds);
      await assertFileExists(ds.id);

      const result = await repository.delete(ds.id);
      expect(result).toBe(true);
      await expect(fs.stat(entityFilePath(ds.id))).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('revealSecrets', () => {
    it('returns config as-is', async () => {
      const config = { url: 'secret://x' };
      const result = await repository.revealSecrets(config);
      expect(result).toEqual(config);
    });
  });
});
