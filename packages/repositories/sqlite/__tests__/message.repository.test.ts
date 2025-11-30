import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { v4 as uuidv4 } from 'uuid';

import { MessageRole } from '@qwery/domain/entities';
import type { Message, Conversation, Project } from '@qwery/domain/entities';

import { MessageRepository } from '../src/message.repository';
import { ConversationRepository } from '../src/conversation.repository';
import { ProjectRepository } from '../src/project.repository';
import { OrganizationRepository } from '../src/organization.repository';
import type { Organization } from '@qwery/domain/entities';

describe('MessageRepository', () => {
  let repository: MessageRepository;
  let conversationRepository: ConversationRepository;
  let projectRepository: ProjectRepository;
  let organizationRepository: OrganizationRepository;
  let testDbPath: string;
  let testProjectId: string;
  let testConversationId: string;

  beforeEach(async () => {
    testDbPath = join(
      tmpdir(),
      `test-messages-${Date.now()}-${Math.random().toString(36).substring(7)}.db`,
    );

    // Create repositories (they all use the same database)
    organizationRepository = new OrganizationRepository(testDbPath);
    projectRepository = new ProjectRepository(testDbPath);
    conversationRepository = new ConversationRepository(testDbPath);
    repository = new MessageRepository(testDbPath);

    // Create a test organization
    const testOrgId = uuidv4();
    const testOrganization: Organization = {
      id: testOrgId,
      name: 'Test Organization',
      slug: 'test-org',
      is_owner: false,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    };
    await organizationRepository.create(testOrganization);

    // Create a test project
    testProjectId = uuidv4();
    const testProject: Project = {
      id: testProjectId,
      org_id: testOrgId,
      name: 'Test Project',
      slug: 'test-project',
      description: 'Test Description',
      status: 'active',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    };
    await projectRepository.create(testProject);

    // Create a test conversation
    testConversationId = uuidv4();
    const testConversation: Conversation = {
      id: testConversationId,
      slug: 'test-conversation',
      title: 'Test Conversation',
      projectId: testProjectId,
      taskId: uuidv4(),
      datasources: [],
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
      createdBy: 'test-user',
      updatedBy: 'test-user',
    };
    await conversationRepository.create(testConversation);
  });

  afterEach(async () => {
    await repository.close();
    await conversationRepository.close();
    await projectRepository.close();
    await organizationRepository.close();
    try {
      unlinkSync(testDbPath);
    } catch {
      // File might not exist, ignore
    }
  });

  const createTestMessage = (overrides?: Partial<Message>): Message => {
    const id = overrides?.id || uuidv4();
    return {
      id,
      conversationId: overrides?.conversationId || testConversationId,
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
      expect(result.metadata).toEqual(message.metadata);
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

    it('should properly serialize and deserialize complex content objects', async () => {
      const complexContent = {
        id: 'msg-123',
        role: 'assistant',
        metadata: { source: 'test' },
        parts: [
          { type: 'text', text: 'Hello world' },
          { type: 'text', text: 'How are you?' },
        ],
      };

      const message = createTestMessage({
        content: complexContent,
      });

      const result = await repository.create(message);
      expect(result.content).toEqual(complexContent);

      const found = await repository.findById(message.id);
      expect(found?.content).toEqual(complexContent);
      expect(found?.content).toHaveProperty('id');
      expect(found?.content).toHaveProperty('role');
      expect(found?.content).toHaveProperty('parts');
      expect(
        Array.isArray((found?.content as Record<string, unknown>).parts),
      ).toBe(true);
    });

    it('should properly serialize and deserialize UIMessage structure in content', async () => {
      const uiMessageContent = {
        id: 'ui-msg-1',
        role: 'user',
        metadata: { timestamp: '2024-01-01' },
        parts: [{ type: 'text', text: 'User message' }],
      };

      const message = createTestMessage({
        content: uiMessageContent,
      });

      await repository.create(message);
      const found = await repository.findById(message.id);

      expect(found?.content).toEqual(uiMessageContent);
      expect((found?.content as Record<string, unknown>).id).toBe('ui-msg-1');
      expect((found?.content as Record<string, unknown>).role).toBe('user');
      expect((found?.content as Record<string, unknown>).parts).toHaveLength(1);
    });

    it('should handle empty content object', async () => {
      const message = createTestMessage({
        content: {},
      });

      const result = await repository.create(message);
      expect(result.content).toEqual({});

      const found = await repository.findById(message.id);
      expect(found?.content).toEqual({});
    });

    it('should handle nested objects in content', async () => {
      const nestedContent = {
        level1: {
          level2: {
            level3: 'deep value',
            array: [1, 2, 3],
          },
        },
      };

      const message = createTestMessage({
        content: nestedContent,
      });

      const result = await repository.create(message);
      expect(result.content).toEqual(nestedContent);

      const found = await repository.findById(message.id);
      expect(
        (
          (found?.content as Record<string, unknown>).level1 as Record<
            string,
            unknown
          >
        ).level2 as Record<string, unknown>,
      ).toHaveProperty('level3');
      expect(
        (
          (found?.content as Record<string, unknown>).level1 as Record<
            string,
            unknown
          >
        ).level2 as Record<string, unknown>,
      ).toHaveProperty('array');
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

    it('should properly deserialize content from database', async () => {
      const complexContent = {
        role: 'assistant',
        parts: [{ type: 'text', text: 'Test' }],
      };

      const message = createTestMessage({ content: complexContent });
      await repository.create(message);

      const found = await repository.findById(message.id);
      expect(found?.content).toEqual(complexContent);
      expect(typeof found?.content).toBe('object');
      expect((found?.content as Record<string, unknown>).role).toBe(
        'assistant',
      );
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
      // Create a second conversation
      const conversationId2 = uuidv4();
      const testConversation2: Conversation = {
        id: conversationId2,
        slug: 'test-conversation-2',
        title: 'Test Conversation 2',
        projectId: testProjectId,
        taskId: uuidv4(),
        datasources: [],
        createdAt: new Date('2024-01-01T00:00:00Z'),
        updatedAt: new Date('2024-01-01T00:00:00Z'),
        createdBy: 'test-user',
        updatedBy: 'test-user',
      };
      await conversationRepository.create(testConversation2);

      const message1 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
      });
      const message2 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
      });
      const message3 = createTestMessage({
        id: uuidv4(),
        conversationId: conversationId2,
      });

      await repository.create(message1);
      await repository.create(message2);
      await repository.create(message3);

      const result = await repository.findByConversationId(testConversationId);

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
      const now = new Date('2024-01-01T00:00:00Z');

      const message1 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
        createdAt: new Date(now.getTime() + 2000),
      });
      const message2 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
        createdAt: new Date(now.getTime() + 1000),
      });
      const message3 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
        createdAt: now,
      });

      await repository.create(message1);
      await repository.create(message2);
      await repository.create(message3);

      const result = await repository.findByConversationId(testConversationId);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe(message3.id);
      expect(result[1]?.id).toBe(message2.id);
      expect(result[2]?.id).toBe(message1.id);
    });

    it('should properly deserialize content for all messages', async () => {
      const message1 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
        content: { role: 'user', parts: [{ type: 'text', text: 'Msg 1' }] },
      });
      const message2 = createTestMessage({
        id: uuidv4(),
        conversationId: testConversationId,
        content: {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Msg 2' }],
        },
      });

      await repository.create(message1);
      await repository.create(message2);

      const result = await repository.findByConversationId(testConversationId);

      expect(result).toHaveLength(2);
      expect(result[0]?.content).toEqual(message1.content);
      expect(result[1]?.content).toEqual(message2.content);
    });
  });

  describe('findAll', () => {
    it('should return empty array when no messages exist', async () => {
      const result = await repository.findAll();

      expect(result).toEqual([]);
    });

    it('should return all messages', async () => {
      const message1 = createTestMessage({
        id: uuidv4(),
      });
      const message2 = createTestMessage({
        id: uuidv4(),
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
        id: uuidv4(),
        createdAt: new Date(now.getTime() + 2000),
      });
      const message2 = createTestMessage({
        id: uuidv4(),
        createdAt: new Date(now.getTime() + 1000),
      });
      const message3 = createTestMessage({
        id: uuidv4(),
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
          id: uuidv4(),
        });
        await repository.create(message);
      }

      const limited = await repository.findAll({ limit: 3 });
      expect(limited).toHaveLength(3);
    });

    it('should support pagination with offset', async () => {
      for (let i = 0; i < 5; i++) {
        const message = createTestMessage({
          id: uuidv4(),
        });
        await repository.create(message);
      }

      const offsetted = await repository.findAll({ offset: 2 });
      expect(offsetted).toHaveLength(3);
    });

    it('should support pagination with limit and offset', async () => {
      for (let i = 0; i < 10; i++) {
        const message = createTestMessage({
          id: uuidv4(),
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
        updatedAt: new Date('2024-01-02T00:00:00Z'),
        updatedBy: 'updated-user',
      };

      const result = await repository.update(updatedMessage);

      expect(result.content).toEqual({ text: 'Updated message' });
      expect(result.metadata).toEqual({ updated: true });
      expect(result.updatedBy).toBe('updated-user');

      const found = await repository.findById(message.id);
      expect(found?.content).toEqual({ text: 'Updated message' });
      expect(found?.metadata).toEqual({ updated: true });
    });

    it('should properly serialize and deserialize updated content', async () => {
      const message = createTestMessage({
        content: { role: 'user', parts: [{ type: 'text', text: 'Original' }] },
      });
      await repository.create(message);

      const updatedContent = {
        role: 'assistant',
        parts: [
          { type: 'text', text: 'Updated' },
          { type: 'text', text: 'Response' },
        ],
      };

      const updatedMessage: Message = {
        ...message,
        content: updatedContent,
        updatedAt: new Date(),
      };

      const result = await repository.update(updatedMessage);
      expect(result.content).toEqual(updatedContent);

      const found = await repository.findById(message.id);
      expect(found?.content).toEqual(updatedContent);
      expect((found?.content as Record<string, unknown>).parts).toHaveLength(2);
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

    it('should throw error when updating non-existent message', async () => {
      const message = createTestMessage({
        id: uuidv4(),
      });

      await expect(repository.update(message)).rejects.toThrow('not found');
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

    it('should return false when message does not exist', async () => {
      const result = await repository.delete('non-existent-id');

      expect(result).toBe(false);
    });

    it('should only delete the specified message', async () => {
      const message1 = createTestMessage({
        id: uuidv4(),
      });
      const message2 = createTestMessage({
        id: uuidv4(),
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

  describe('metadata handling', () => {
    it('should properly serialize and deserialize metadata', async () => {
      const complexMetadata = {
        source: 'test',
        tags: ['tag1', 'tag2'],
        nested: {
          value: 123,
          flag: true,
        },
      };

      const message = createTestMessage({
        metadata: complexMetadata,
      });

      const result = await repository.create(message);
      expect(result.metadata).toEqual(complexMetadata);

      const found = await repository.findById(message.id);
      expect(found?.metadata).toEqual(complexMetadata);
      expect((found?.metadata as Record<string, unknown>).tags).toEqual([
        'tag1',
        'tag2',
      ]);
    });

    it('should handle empty metadata', async () => {
      const message = createTestMessage({
        metadata: {},
      });

      const result = await repository.create(message);
      expect(result.metadata).toEqual({});

      const found = await repository.findById(message.id);
      expect(found?.metadata).toEqual({});
    });
  });

  describe('integration', () => {
    it('should handle full CRUD lifecycle', async () => {
      const message = createTestMessage();

      const created = await repository.create(message);
      expect(created.id).toBe(message.id);
      expect(created.content).toEqual(message.content);

      const found = await repository.findById(message.id);
      expect(found?.id).toBe(message.id);
      expect(found?.content).toEqual(message.content);

      const updated = {
        ...message,
        content: { text: 'Updated' },
        updatedAt: new Date('2024-01-03T00:00:00Z'),
      };
      const updatedResult = await repository.update(updated);
      expect(updatedResult.content).toEqual({ text: 'Updated' });

      const deleted = await repository.delete(message.id);
      expect(deleted).toBe(true);

      const foundAfterDelete = await repository.findById(message.id);
      expect(foundAfterDelete).toBeNull();
    });

    it('should handle multiple messages independently', async () => {
      const m1 = createTestMessage({
        id: uuidv4(),
        content: { role: 'user', parts: [{ type: 'text', text: 'Msg 1' }] },
      });
      const m2 = createTestMessage({
        id: uuidv4(),
        content: {
          role: 'assistant',
          parts: [{ type: 'text', text: 'Msg 2' }],
        },
      });
      const m3 = createTestMessage({
        id: uuidv4(),
        content: { role: 'user', parts: [{ type: 'text', text: 'Msg 3' }] },
      });

      await repository.create(m1);
      await repository.create(m2);
      await repository.create(m3);

      const all = await repository.findAll();
      expect(all).toHaveLength(3);

      await repository.delete(m2.id);

      const remaining = await repository.findAll();
      expect(remaining).toHaveLength(2);
      expect(remaining.find((m) => m.id === m1.id)).toBeDefined();
      expect(remaining.find((m) => m.id === m3.id)).toBeDefined();
      expect(remaining.find((m) => m.id === m2.id)).toBeUndefined();
    });

    it('should preserve all message fields correctly', async () => {
      const complexMessage = createTestMessage({
        conversationId: testConversationId,
        content: {
          id: 'ui-msg-1',
          role: 'assistant',
          metadata: { source: 'test' },
          parts: [{ type: 'text', text: 'Complex message' }],
        },
        role: MessageRole.ASSISTANT,
        metadata: { custom: 'metadata' },
        createdBy: 'user-1',
        updatedBy: 'user-2',
      });

      await repository.create(complexMessage);
      const found = await repository.findById(complexMessage.id);

      expect(found?.conversationId).toBe(complexMessage.conversationId);
      expect(found?.content).toEqual(complexMessage.content);
      expect(found?.role).toBe(complexMessage.role);
      expect(found?.metadata).toEqual(complexMessage.metadata);
      expect(found?.createdBy).toBe(complexMessage.createdBy);
      expect(found?.updatedBy).toBe(complexMessage.updatedBy);
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
