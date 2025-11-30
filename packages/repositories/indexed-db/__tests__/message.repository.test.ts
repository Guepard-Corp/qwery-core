import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MessageRole } from '@qwery/domain/entities';
import type { Message } from '@qwery/domain/entities';

import { MessageRepository } from '../src/message.repository';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  const testDbName = 'test-messages';

  beforeEach(async () => {
    repository = new MessageRepository(testDbName);
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    repository = new MessageRepository(testDbName);
  });

  afterEach(async () => {
    await repository.close();
    await new Promise<void>((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(testDbName);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
  });

  const createTestMessage = (overrides?: Partial<Message>): Message => {
    const id = overrides?.id || '550e8400-e29b-41d4-a716-446655440000';
    return {
      id,
      conversationId:
        overrides?.conversationId || '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: overrides?.content || { text: 'Test message' },
      role: overrides?.role || MessageRole.USER,
      metadata: overrides?.metadata || {},
      createdAt: overrides?.createdAt || new Date('2024-01-01T00:00:00Z'),
      updatedAt: overrides?.updatedAt || new Date('2024-01-01T00:00:00Z'),
      createdBy: overrides?.createdBy || 'test-user',
      updatedBy: overrides?.updatedBy || 'test-user',
      ...overrides,
    };
  };

  describe('create', () => {
    it('should create a new message', async () => {
      const message = createTestMessage();
      const result = await repository.create(message);

      expect(result.id).toBe(message.id);
      expect(result.conversationId).toBe(message.conversationId);
      expect(result.content).toEqual(message.content);
      expect(result.role).toBe(message.role);
    });

    it('should automatically generate id when not provided', async () => {
      const message = createTestMessage({ id: '' });
      const result = await repository.create(message);

      expect(result.id).toBeDefined();
      expect(result.id).not.toBe('');
    });

    it('should throw error when creating duplicate message', async () => {
      const message = createTestMessage();
      await repository.create(message);

      await expect(repository.create(message)).rejects.toThrow(
        'already exists',
      );
    });
  });

  describe('findById', () => {
    it('should find a message by id', async () => {
      const message = createTestMessage();
      await repository.create(message);

      const result = await repository.findById(message.id);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(message.id);
      expect(result?.conversationId).toBe(message.conversationId);
      expect(result?.content).toEqual(message.content);
      expect(result?.role).toBe(message.role);
      expect(result?.createdAt).toBeInstanceOf(Date);
      expect(result?.updatedAt).toBeInstanceOf(Date);
    });

    it('should return null when message not found', async () => {
      const result = await repository.findById('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('findBySlug', () => {
    it('should return null (messages do not have slugs)', async () => {
      const message = createTestMessage();
      await repository.create(message);

      const found = await repository.findBySlug('any-slug');
      expect(found).toBeNull();
    });
  });

  describe('findByConversationId', () => {
    it('should find messages by conversation id', async () => {
      const conversationId1 = '550e8400-e29b-41d4-a716-446655440000';
      const conversationId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

      const message1 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440001',
        conversationId: conversationId1,
      });
      const message2 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440002',
        conversationId: conversationId1,
      });
      const message3 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440003',
        conversationId: conversationId2,
      });

      await repository.create(message1);
      await repository.create(message2);
      await repository.create(message3);

      const result = await repository.findByConversationId(conversationId1);

      expect(result).toHaveLength(2);
      expect(result.map((m) => m.id)).toContain(message1.id);
      expect(result.map((m) => m.id)).toContain(message2.id);
      expect(result.map((m) => m.id)).not.toContain(message3.id);
    });

    it('should return empty array when conversation has no messages', async () => {
      const result = await repository.findByConversationId('nonexistent-id');
      expect(result).toEqual([]);
    });

    it('should sort messages by createdAt ASC', async () => {
      const conversationId = '550e8400-e29b-41d4-a716-446655440000';
      const now = new Date('2024-01-01T00:00:00Z');

      const message1 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440001',
        conversationId,
        createdAt: new Date(now.getTime() + 2000),
      });
      const message2 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440002',
        conversationId,
        createdAt: new Date(now.getTime() + 1000),
      });
      const message3 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440003',
        conversationId,
        createdAt: now,
      });

      await repository.create(message1);
      await repository.create(message2);
      await repository.create(message3);

      const result = await repository.findByConversationId(conversationId);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe(message3.id);
      expect(result[1]?.id).toBe(message2.id);
      expect(result[2]?.id).toBe(message1.id);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no messages exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all messages', async () => {
      const message1 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      const message2 = createTestMessage({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      });

      await repository.create(message1);
      await repository.create(message2);

      const result = await repository.findAll();

      expect(result).toHaveLength(2);
      expect(result.find((m) => m.id === message1.id)).toMatchObject({
        id: message1.id,
        conversationId: message1.conversationId,
      });
      expect(result.find((m) => m.id === message2.id)).toMatchObject({
        id: message2.id,
        conversationId: message2.conversationId,
      });
    });

    it('should preserve date objects in results', async () => {
      const message = createTestMessage();
      await repository.create(message);

      const result = await repository.findAll();

      expect(result[0]?.createdAt).toBeInstanceOf(Date);
      expect(result[0]?.updatedAt).toBeInstanceOf(Date);
    });

    it('should sort by createdAt ASC by default', async () => {
      const now = new Date('2024-01-01T00:00:00Z');

      const message1 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440001',
        createdAt: new Date(now.getTime() + 2000),
      });
      const message2 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440002',
        createdAt: new Date(now.getTime() + 1000),
      });
      const message3 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440003',
        createdAt: now,
      });

      await repository.create(message1);
      await repository.create(message2);
      await repository.create(message3);

      const result = await repository.findAll();

      expect(result[0]?.id).toBe(message3.id);
      expect(result[1]?.id).toBe(message2.id);
      expect(result[2]?.id).toBe(message1.id);
    });

    it('should support pagination with limit', async () => {
      for (let i = 0; i < 5; i++) {
        const message = createTestMessage({
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
        });
        await repository.create(message);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should support pagination with offset', async () => {
      for (let i = 0; i < 5; i++) {
        const message = createTestMessage({
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
        });
        await repository.create(message);
      }

      const offsetted = await repository.findAll({ offset: 2 });
      expect(offsetted).toHaveLength(3);
    });

    it('should support pagination with limit and offset', async () => {
      for (let i = 0; i < 10; i++) {
        const message = createTestMessage({
          id: `01ARZ3NDEKTSV4RRFFQ69G5F${i}`,
        });
        await repository.create(message);
      }

      const paginated = await repository.findAll({ offset: 2, limit: 3 });
      expect(paginated).toHaveLength(3);
    });
  });

  describe('update', () => {
    it('should update an existing message', async () => {
      const message = createTestMessage();
      await repository.create(message);

      const updatedMessage: Message = {
        ...message,
        content: { text: 'Updated message' },
        metadata: { updated: true },
        updatedAt: new Date(),
      };

      const result = await repository.update(updatedMessage);

      expect(result.content).toEqual({ text: 'Updated message' });
      expect(result.metadata).toEqual({ updated: true });

      const found = await repository.findById(message.id);
      expect(found?.content).toEqual({ text: 'Updated message' });
    });

    it('should preserve metadata structure', async () => {
      const message = createTestMessage({
        metadata: { key1: 'value1', key2: 123 },
      });
      await repository.create(message);

      const updatedMessage: Message = {
        ...message,
        metadata: { key1: 'updated', key3: true },
        updatedAt: new Date(),
      };

      await repository.update(updatedMessage);

      const found = await repository.findById(message.id);
      expect(found?.metadata).toEqual({ key1: 'updated', key3: true });
    });
  });

  describe('delete', () => {
    it('should delete an existing message', async () => {
      const message = createTestMessage();
      await repository.create(message);

      const result = await repository.delete(message.id);

      expect(result).toBe(true);

      const found = await repository.findById(message.id);
      expect(found).toBeNull();
    });

    it('should only delete the specified message', async () => {
      const message1 = createTestMessage({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      const message2 = createTestMessage({
        id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      });

      await repository.create(message1);
      await repository.create(message2);

      await repository.delete(message1.id);

      const found1 = await repository.findById(message1.id);
      const found2 = await repository.findById(message2.id);

      expect(found1).toBeNull();
      expect(found2).not.toBeNull();
    });
  });

  describe('shortenId', () => {
    it('should shorten an id', () => {
      const shortened = repository.shortenId(
        '550e8400-e29b-41d4-a716-446655440000',
      );
      expect(shortened).toBeDefined();
      expect(typeof shortened).toBe('string');
      expect(shortened.length).toBeLessThan(
        '550e8400-e29b-41d4-a716-446655440000'.length,
      );
    });
  });
});
