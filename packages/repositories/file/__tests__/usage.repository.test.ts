import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { Usage } from '@qwery/domain/entities';

import { ConversationRepository } from '../src/conversation.repository.js';
import { UsageRepository } from '../src/usage.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(id: string): string {
  return path.join(getStorageDir(), 'usage', `${id}.json`);
}

async function assertFileExists(id: string): Promise<void> {
  const filePath = entityFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('UsageRepository', () => {
  let repository: UsageRepository;
  let testDir: string;
  const conversationId = '550e8400-e29b-41d4-a716-446655440000';
  const projectId = '660e8400-e29b-41d4-a716-446655440000';
  const organizationId = '760e8400-e29b-41d4-a716-446655440000';
  const userId = '860e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-usage-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new UsageRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const defaultUsageId = 'a1000001-0000-4000-8000-000000000001';
  const createTestUsage = (overrides?: Partial<Usage>): Usage => ({
    id: (overrides?.id as string) ?? defaultUsageId,
    conversationId,
    projectId,
    organizationId,
    userId,
    model: 'test-model',
    inputTokens: 10,
    outputTokens: 20,
    totalTokens: 30,
    ...overrides,
  });

  describe('create', () => {
    it('creates usage and persists file on disk', async () => {
      const usage = createTestUsage();
      const result = await repository.create(usage);

      expect(result.id).toBeDefined();
      expect(result.model).toBe(usage.model);
      await assertFileExists(result.id);
      const raw = await fs.readFile(entityFilePath(result.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.model).toBe(usage.model);
    });

    it('persists usage with provided uuid', async () => {
      const id = 'b2000002-0000-4000-8000-000000000002';
      const usage = createTestUsage({ id });
      const result = await repository.create(usage);
      expect(result.id).toBe(id);
      await assertFileExists(result.id);
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const id = 'c3000003-0000-4000-8000-000000000003';
      const usage = createTestUsage({ id });
      await repository.create(usage);
      await assertFileExists(usage.id);

      const result = await repository.findById(usage.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(String(usage.id));
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('999999');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('returns null (usage has no slug lookup)', async () => {
      const result = await repository.findBySlug('any');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('supports offset and limit', async () => {
      const usage = createTestUsage({
        id: 'd4000004-0000-4000-8000-000000000004',
      });
      await repository.create(usage);
      const all = await repository.findAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
      const page = await repository.findAll({ offset: 0, limit: 1 });
      expect(page).toHaveLength(1);
    });
  });

  describe('findByConversationId', () => {
    it('returns usage for conversation', async () => {
      const usage = createTestUsage();
      await repository.create(usage);
      const result = await repository.findByConversationId(conversationId);
      expect(result).toHaveLength(1);
      expect(result[0]?.conversationId).toBe(conversationId);
    });
  });

  describe('findByConversationSlug', () => {
    it('returns usage when conversation slug matches', async () => {
      const convRepo = new ConversationRepository();
      const conv = await convRepo.create({
        id: conversationId,
        slug: 'ignored',
        title: 'Conv',
        projectId,
        taskId: '880e8400-e29b-41d4-a716-446655440000',
        datasources: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'user',
        updatedBy: 'user',
        isPublic: false,
      });
      const storedSlug = convRepo.shortenId(conv.id);
      const usage = createTestUsage({
        conversationId: conv.id,
      });
      await repository.create(usage);
      const result = await repository.findByConversationSlug(storedSlug);
      expect(result).toHaveLength(1);
      expect(result[0]?.conversationId).toBe(conv.id);
    });

    it('returns empty when conversation slug not found', async () => {
      const result = await repository.findByConversationSlug('no-such-slug');
      expect(result).toEqual([]);
    });
  });

  describe('update', () => {
    it('updates and persists to disk', async () => {
      const id = 'e5000005-0000-4000-8000-000000000005';
      const usage = createTestUsage({ id });
      await repository.create(usage);
      const updated = await repository.update({
        ...usage,
        outputTokens: 100,
      });
      expect(updated.outputTokens).toBe(100);
      const raw = await fs.readFile(entityFilePath(usage.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.outputTokens).toBe(100);
    });

    it('throws when usage not found', async () => {
      const usage = createTestUsage({
        id: 'f6000006-0000-4000-8000-000000000006',
      });
      await repository.create(usage);
      await expect(
        repository.update({
          ...usage,
          id: 'f7000007-0000-4000-8000-000000000007',
        }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const id = 'a8000008-0000-4000-8000-000000000008';
      const usage = createTestUsage({ id });
      await repository.create(usage);
      await assertFileExists(usage.id);

      const result = await repository.delete(usage.id);
      expect(result).toBe(true);
      await expect(fs.stat(entityFilePath(usage.id))).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('999999');
      expect(result).toBe(false);
    });
  });
});
