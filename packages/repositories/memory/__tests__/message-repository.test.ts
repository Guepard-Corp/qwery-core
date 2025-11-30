import { beforeEach, describe, expect, it } from 'vitest';

import { MessageRole } from '@qwery/domain/entities';
import type { Message } from '@qwery/domain/entities';

import { MessageRepository } from '../src/message-repository';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  const validUuid1 = '550e8400-e29b-41d4-a716-446655440000';
  const validUuid2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const conversationId1 = '7ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const conversationId2 = '8ba7b810-9dad-11d1-80b4-00c04fd430c8';

  beforeEach(() => {
    repository = new MessageRepository();
  });

  const createTestMessage = (overrides?: Partial<Message>): Message => ({
    id: overrides?.id || validUuid1,
    conversationId: overrides?.conversationId || conversationId1,
    content: overrides?.content || { text: 'Test message' },
    role: overrides?.role || MessageRole.USER,
    metadata: overrides?.metadata || {},
    createdAt: overrides?.createdAt || new Date(),
    updatedAt: overrides?.updatedAt || new Date(),
    createdBy: overrides?.createdBy || 'user-id',
    updatedBy: overrides?.updatedBy || 'user-id',
  });

  describe('create', () => {
    it('should create a message', async () => {
      const message = createTestMessage();

      const result = await repository.create(message);

      expect(result).toEqual(message);
      expect(result.id).toBe(validUuid1);
      expect(result.conversationId).toBe(conversationId1);
    });

    it('should create multiple messages', async () => {
      const message1 = createTestMessage({ id: validUuid1 });
      const message2 = createTestMessage({ id: validUuid2 });

      await repository.create(message1);
      await repository.create(message2);

      const allMessages = await repository.findAll();
      expect(allMessages).toHaveLength(2);
    });
  });

  describe('findById', () => {
    it('should find message by id', async () => {
      const message = createTestMessage();

      await repository.create(message);
      const found = await repository.findById(validUuid1);

      expect(found).toEqual(message);
    });

    it('should return null when message not found', async () => {
      const found = await repository.findById('nonexistent-id');
      expect(found).toBeNull();
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
      const message1 = createTestMessage({
        id: validUuid1,
        conversationId: conversationId1,
      });
      const message2 = createTestMessage({
        id: validUuid2,
        conversationId: conversationId1,
      });
      const message3 = createTestMessage({
        id: '9ba7b810-9dad-11d1-80b4-00c04fd430c8',
        conversationId: conversationId2,
      });

      await repository.create(message1);
      await repository.create(message2);
      await repository.create(message3);

      const found = await repository.findByConversationId(conversationId1);

      expect(found).toHaveLength(2);
      expect(found.map((m) => m.id)).toContain(validUuid1);
      expect(found.map((m) => m.id)).toContain(validUuid2);
    });

    it('should return empty array when conversation has no messages', async () => {
      const found = await repository.findByConversationId('nonexistent-id');
      expect(found).toEqual([]);
    });

    it('should sort messages by createdAt ASC', async () => {
      const now = new Date();
      const message1 = createTestMessage({
        id: validUuid1,
        conversationId: conversationId1,
        createdAt: new Date(now.getTime() + 1000),
      });
      const message2 = createTestMessage({
        id: validUuid2,
        conversationId: conversationId1,
        createdAt: now,
      });

      await repository.create(message1);
      await repository.create(message2);

      const found = await repository.findByConversationId(conversationId1);

      expect(found).toHaveLength(2);
      expect(found[0]?.id).toBe(validUuid2);
      expect(found[1]?.id).toBe(validUuid1);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no messages exist', async () => {
      const messages = await repository.findAll();
      expect(messages).toEqual([]);
    });

    it('should return all messages', async () => {
      const message1 = createTestMessage({ id: validUuid1 });
      const message2 = createTestMessage({ id: validUuid2 });

      await repository.create(message1);
      await repository.create(message2);

      const messages = await repository.findAll();
      expect(messages).toHaveLength(2);
      expect(messages).toContainEqual(message1);
      expect(messages).toContainEqual(message2);
    });

    it('should sort by createdAt ASC by default', async () => {
      const now = new Date();
      const message1 = createTestMessage({
        id: validUuid1,
        createdAt: new Date(now.getTime() + 1000),
      });
      const message2 = createTestMessage({
        id: validUuid2,
        createdAt: now,
      });

      await repository.create(message1);
      await repository.create(message2);

      const messages = await repository.findAll();
      expect(messages[0]?.id).toBe(validUuid2);
      expect(messages[1]?.id).toBe(validUuid1);
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
      };

      const result = await repository.update(updatedMessage);

      expect(result.content).toEqual({ text: 'Updated message' });
      expect(result.metadata).toEqual({ updated: true });

      const found = await repository.findById(validUuid1);
      expect(found?.content).toEqual({ text: 'Updated message' });
    });

    it('should throw error when updating non-existent message', async () => {
      const message = createTestMessage();

      await expect(repository.update(message)).rejects.toThrow(
        `Message with id ${validUuid1} not found`,
      );
    });
  });

  describe('delete', () => {
    it('should delete an existing message', async () => {
      const message = createTestMessage();

      await repository.create(message);
      const result = await repository.delete(validUuid1);

      expect(result).toBe(true);

      const found = await repository.findById(validUuid1);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent message', async () => {
      const result = await repository.delete('nonexistent-id');
      expect(result).toBe(false);
    });

    it('should only delete the specified message', async () => {
      const message1 = createTestMessage({ id: validUuid1 });
      const message2 = createTestMessage({ id: validUuid2 });

      await repository.create(message1);
      await repository.create(message2);

      await repository.delete(validUuid1);

      const found1 = await repository.findById(validUuid1);
      const found2 = await repository.findById(validUuid2);

      expect(found1).toBeNull();
      expect(found2).toEqual(message2);
    });
  });

  describe('shortenId', () => {
    it('should shorten an id', () => {
      const shortened = repository.shortenId(validUuid1);
      expect(shortened).toBeDefined();
      expect(typeof shortened).toBe('string');
      expect(shortened.length).toBeLessThan(validUuid1.length);
    });
  });
});
