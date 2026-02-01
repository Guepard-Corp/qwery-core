import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { Conversation } from '@qwery/domain/entities';

import { ConversationRepository } from '../src/conversation.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(id: string): string {
  return path.join(getStorageDir(), 'conversation', `${id}.json`);
}

async function assertFileExists(id: string): Promise<void> {
  const filePath = entityFilePath(id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('ConversationRepository', () => {
  let repository: ConversationRepository;
  let testDir: string;
  const projectId = '550e8400-e29b-41d4-a716-446655440000';
  const taskId = '880e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-conv-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new ConversationRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestConversation = (
    overrides?: Partial<Conversation>,
  ): Conversation => {
    const id = overrides?.id ?? '990e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      slug: repository.shortenId(id),
      title: 'Test Conversation',
      projectId,
      taskId,
      datasources: [],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'user',
      updatedBy: 'user',
      isPublic: false,
      ...overrides,
    };
  };

  describe('create', () => {
    it('creates conversation and persists file on disk', async () => {
      const conv = createTestConversation();
      const result = await repository.create(conv);

      expect(result.id).toBeDefined();
      expect(result.title).toBe(conv.title);
      await assertFileExists(result.id);
      const raw = await fs.readFile(entityFilePath(result.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.title).toBe(conv.title);
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const conv = createTestConversation();
      await repository.create(conv);
      await assertFileExists(conv.id);

      const result = await repository.findById(conv.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(conv.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('finds by slug', async () => {
      const conv = createTestConversation();
      await repository.create(conv);
      const result = await repository.findBySlug(repository.shortenId(conv.id));
      expect(result).not.toBeNull();
      expect(result?.id).toBe(conv.id);
    });

    it('returns null when slug not found', async () => {
      const result = await repository.findBySlug('nonexistent-slug');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('supports offset and limit', async () => {
      const conv1 = createTestConversation({
        id: '990e8400-e29b-41d4-a716-446655440001',
      });
      const conv2 = createTestConversation({
        id: '990e8400-e29b-41d4-a716-446655440002',
      });
      await repository.create(conv1);
      await repository.create(conv2);
      const page = await repository.findAll({ offset: 0, limit: 1 });
      expect(page).toHaveLength(1);
      const second = await repository.findAll({ offset: 1, limit: 1 });
      expect(second).toHaveLength(1);
    });
  });

  describe('findByProjectId', () => {
    it('returns conversations for project', async () => {
      const conv = createTestConversation();
      await repository.create(conv);
      const result = await repository.findByProjectId(projectId);
      expect(result).toHaveLength(1);
      expect(result[0]?.projectId).toBe(projectId);
    });
  });

  describe('findByTaskId', () => {
    it('returns conversations for task', async () => {
      const conv = createTestConversation();
      await repository.create(conv);
      const result = await repository.findByTaskId(taskId);
      expect(result).toHaveLength(1);
      expect(result[0]?.taskId).toBe(taskId);
    });
  });

  describe('update', () => {
    it('updates and persists to disk with slug', async () => {
      const conv = createTestConversation();
      await repository.create(conv);
      const updated = await repository.update({
        ...conv,
        title: 'Updated Conversation',
        updatedAt: new Date(),
        updatedBy: 'other',
      });
      expect(updated.title).toBe('Updated Conversation');
      expect(updated.slug).toBe(repository.shortenId(conv.id));
      const raw = await fs.readFile(entityFilePath(conv.id), 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.title).toBe('Updated Conversation');
      expect(parsed.slug).toBe(repository.shortenId(conv.id));
    });

    it('throws when conversation not found', async () => {
      const conv = createTestConversation();
      await expect(
        repository.update({ ...conv, id: 'non-existent' }),
      ).rejects.toThrow('not found');
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const conv = createTestConversation();
      await repository.create(conv);
      await assertFileExists(conv.id);

      const result = await repository.delete(conv.id);
      expect(result).toBe(true);
      await expect(fs.stat(entityFilePath(conv.id))).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
