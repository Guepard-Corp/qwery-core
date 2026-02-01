import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { Notebook } from '@qwery/domain/entities';

import { NotebookRepository } from '../src/notebook.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(id: string): string {
  return path.join(getStorageDir(), 'notebook', `${id}.json`);
}

async function assertFileExists(id: string): Promise<void> {
  const filePath = entityFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('NotebookRepository', () => {
  let repository: NotebookRepository;
  let testDir: string;
  const projectId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-nb-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new NotebookRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestNotebook = (overrides?: Partial<Notebook>): Notebook => {
    const id = overrides?.id ?? '770e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      slug: repository.shortenId(id),
      title: 'Test Notebook',
      projectId,
      datasources: [],
      cells: [],
      version: 1,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      isPublic: false,
      ...overrides,
    };
  };

  describe('create', () => {
    it('creates notebook and persists file on disk', async () => {
      const nb = createTestNotebook();
      const result = await repository.create(nb);

      expect(result.id).toBeDefined();
      expect(result.title).toBe(nb.title);
      await assertFileExists(result.id);
      const raw = await fs.readFile(entityFilePath(result.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.title).toBe(nb.title);
    });

    it('persists description and createdBy for deserialize coverage', async () => {
      const nb = createTestNotebook({
        description: 'A description',
        createdBy: 'user-id',
      });
      const result = await repository.create(nb);
      const found = await repository.findById(result.id);
      expect(found?.description).toBe('A description');
      expect(found?.createdBy).toBe('user-id');
    });

    it('persists notebook with empty description for deserialize', async () => {
      const nb = createTestNotebook({ description: '' });
      const result = await repository.create(nb);
      const found = await repository.findById(result.id);
      expect(found?.description).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const nb = createTestNotebook();
      await repository.create(nb);
      await assertFileExists(nb.id);

      const result = await repository.findById(nb.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(nb.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('finds by slug', async () => {
      const nb = createTestNotebook();
      await repository.create(nb);
      const result = await repository.findBySlug(repository.shortenId(nb.id));
      expect(result).not.toBeNull();
      expect(result?.id).toBe(nb.id);
    });

    it('returns null when slug not found', async () => {
      const result = await repository.findBySlug('nonexistent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findByProjectId', () => {
    it('returns notebooks for project', async () => {
      const nb = createTestNotebook();
      await repository.create(nb);
      const result = await repository.findByProjectId(projectId);
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result?.[0]?.projectId).toBe(projectId);
    });

    it('returns null when no notebooks for project', async () => {
      const result = await repository.findByProjectId(
        '00000000-0000-0000-0000-000000000000',
      );
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates and persists to disk', async () => {
      const nb = createTestNotebook();
      await repository.create(nb);
      const updated = await repository.update({
        ...nb,
        title: 'Updated Notebook',
        updatedAt: new Date(),
      });
      expect(updated.title).toBe('Updated Notebook');
      const raw = await fs.readFile(entityFilePath(nb.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.title).toBe('Updated Notebook');
    });

    it('throws when notebook not found', async () => {
      const nb = createTestNotebook();
      await expect(
        repository.update({ ...nb, id: 'non-existent' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const nb = createTestNotebook();
      await repository.create(nb);
      await assertFileExists(nb.id);

      const result = await repository.delete(nb.id);
      expect(result).toBe(true);
      await expect(fs.stat(entityFilePath(nb.id))).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
