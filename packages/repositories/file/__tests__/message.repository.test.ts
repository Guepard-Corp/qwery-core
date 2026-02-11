import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';

import type { Message } from '@qwery/domain/entities';
import { MessageRole } from '@qwery/domain/entities';

import { MessageRepository } from '../src/message.repository.js';
import { getStorageDir, setStorageDir, resetStorageDir } from '../src/path.js';

function entityFilePath(conversationId: string, id: string): string {
  return path.join(getStorageDir(), 'message', conversationId, `${id}.json`);
}

async function assertFileExists(
  conversationId: string,
  id: string,
): Promise<void> {
  const filePath = entityFilePath(conversationId, id);
  const stat = await fs.stat(filePath);
  expect(stat.isFile()).toBe(true);
  expect(stat.size).toBeGreaterThan(0);
}

describe('MessageRepository', () => {
  let repository: MessageRepository;
  let testDir: string;
  const conversationId = '550e8400-e29b-41d4-a716-446655440000';

  beforeEach(async () => {
    testDir = path.join(
      os.tmpdir(),
      `qwery-msg-repo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    );
    await fs.mkdir(testDir, { recursive: true });
    setStorageDir(testDir);
    repository = new MessageRepository();
  });

  afterEach(() => {
    resetStorageDir();
  });

  const createTestMessage = (overrides?: Partial<Message>): Message => ({
    id: overrides?.id ?? '660e8400-e29b-41d4-a716-446655440000',
    conversationId,
    content: {},
    role: MessageRole.USER,
    metadata: {},
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
    createdBy: 'user',
    updatedBy: 'user',
    ...overrides,
  });

  describe('create', () => {
    it('creates message and persists file on disk under conversation dir', async () => {
      const msg = createTestMessage();
      const result = await repository.create(msg);

      expect(result.id).toBeDefined();
      expect(result.conversationId).toBe(conversationId);
      await assertFileExists(result.conversationId, result.id);
      const filePath = entityFilePath(result.conversationId, result.id);
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.conversationId).toBe(conversationId);
      expect(parsed.role).toBe(MessageRole.USER);
    });
  });

  describe('findById', () => {
    it('finds by id', async () => {
      const msg = createTestMessage();
      await repository.create(msg);
      await assertFileExists(msg.conversationId, msg.id);

      const result = await repository.findById(msg.id);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(msg.id);
    });

    it('returns null when not found', async () => {
      const result = await repository.findById('non-existent');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('returns null (messages have no slug lookup)', async () => {
      const result = await repository.findBySlug('any');
      expect(result).toBeNull();
    });
  });

  describe('findByConversationIdPaginated', () => {
    it('returns paginated result with cursor and hasMore', async () => {
      const msg1 = createTestMessage({
        id: '660e8400-e29b-41d4-a716-446655440001',
        createdAt: new Date('2024-01-01T10:00:00Z'),
      });
      const msg2 = createTestMessage({
        id: '660e8400-e29b-41d4-a716-446655440002',
        createdAt: new Date('2024-01-01T11:00:00Z'),
      });
      await repository.create(msg1);
      await repository.create(msg2);
      const page = await repository.findByConversationIdPaginated(
        conversationId,
        { limit: 1, cursor: '2024-01-01T12:00:00Z' },
      );
      expect(page.messages).toHaveLength(1);
      expect(page.hasMore).toBe(true);
      expect(page.nextCursor).not.toBeNull();
      expect(typeof page.nextCursor).toBe('string');
    });

    it('returns nextCursor from first message createdAt', async () => {
      const msg = createTestMessage({
        createdAt: new Date('2024-01-01T09:00:00Z'),
      });
      await repository.create(msg);
      const page = await repository.findByConversationIdPaginated(
        conversationId,
        { limit: 5 },
      );
      expect(page.messages).toHaveLength(1);
      expect(page.nextCursor).toBe('2024-01-01T09:00:00.000Z');
    });
  });

  describe('findByConversationId', () => {
    it('returns messages for conversation', async () => {
      const msg = createTestMessage();
      await repository.create(msg);
      const result = await repository.findByConversationId(conversationId);
      expect(result).toHaveLength(1);
      expect(result[0]?.conversationId).toBe(conversationId);
    });
  });

  describe('findAll', () => {
    it('returns all messages with offset and limit', async () => {
      const msg = createTestMessage();
      await repository.create(msg);
      const all = await repository.findAll();
      expect(all.length).toBeGreaterThanOrEqual(1);
      const limited = await repository.findAll({ offset: 0, limit: 1 });
      expect(limited).toHaveLength(1);
    });
  });

  describe('update', () => {
    it('updates and persists to disk', async () => {
      const msg = createTestMessage();
      await repository.create(msg);
      const updated = await repository.update({
        ...msg,
        content: { parts: [{ type: 'text', text: 'Hi' }] },
        updatedAt: new Date(),
      });
      expect(updated.content).toEqual({
        parts: [{ type: 'text', text: 'Hi' }],
      });
      const filePath = entityFilePath(msg.conversationId, msg.id);
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      expect(parsed.content).toEqual({ parts: [{ type: 'text', text: 'Hi' }] });
    });
  });

  describe('delete', () => {
    it('deletes and removes file from disk', async () => {
      const msg = createTestMessage();
      await repository.create(msg);
      await assertFileExists(msg.conversationId, msg.id);

      const result = await repository.delete(msg.id);
      expect(result).toBe(true);
      await expect(
        fs.stat(entityFilePath(msg.conversationId, msg.id)),
      ).rejects.toThrow();
    });

    it('returns false when not found', async () => {
      const result = await repository.delete('non-existent');
      expect(result).toBe(false);
    });
  });
});
