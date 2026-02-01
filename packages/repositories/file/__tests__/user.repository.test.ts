import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { User } from '@qwery/domain/entities';
import { Roles } from '@qwery/domain/common';

import { UserRepository } from '../src/user.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(id: string): string {
  return path.join(getStorageDir(), 'user', `${id}.json`);
}

async function assertFileExists(id: string): Promise<void> {
  const filePath = entityFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('UserRepository', () => {
  let repository: UserRepository;
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-user-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new UserRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestUser = (overrides?: Partial<User>): User => ({
    id: overrides?.id ?? '550e8400-e29b-41d4-a716-446655440000',
    username: 'testuser',
    role: Roles.USER,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  });

  describe('create', () => {
    it('creates user and persists file on disk', async () => {
      const user = createTestUser();
      const result = await repository.create(user);

      expect(result.id).toBeDefined();
      expect(result.username).toBe(user.username);
      await assertFileExists(result.id);
      const raw = await fs.readFile(entityFilePath(result.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.username).toBe(user.username);
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const user = createTestUser();
      await repository.create(user);
      await assertFileExists(user.id);

      const result = await repository.findById(user.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('finds by slug (username)', async () => {
      const user = createTestUser();
      await repository.create(user);
      const result = await repository.findBySlug(user.username);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(user.id);
    });

    it('returns null when slug not found', async () => {
      const result = await repository.findBySlug('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('updates and persists to disk', async () => {
      const user = createTestUser();
      await repository.create(user);
      const updated = await repository.update({
        ...user,
        username: 'updateduser',
        updatedAt: new Date(),
      });
      expect(updated.username).toBe('updateduser');
      const raw = await fs.readFile(entityFilePath(user.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.username).toBe('updateduser');
    });

    it('throws when entity not found', async () => {
      const user = createTestUser();
      await expect(
        repository.update({ ...user, id: 'non-existent' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const user = createTestUser();
      await repository.create(user);
      await assertFileExists(user.id);

      const result = await repository.delete(user.id);
      expect(result).toBe(true);
      await expect(fs.stat(entityFilePath(user.id))).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
