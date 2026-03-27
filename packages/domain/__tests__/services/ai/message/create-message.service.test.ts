import { describe, expect, it } from 'vitest';
import { PaginatedResult, PaginationOptions } from '../../../../src/common';
import type { Conversation, Message } from '../../../../src/entities';
import { MessageRole } from '../../../../src/entities';
import { ConversationNotFoundError } from '../../../../src/exceptions';
import {
  IConversationRepository,
  IMessageRepository,
} from '../../../../src/repositories';
import { CreateMessageService } from '../../../../src/services/ai/message/create-message.service';

class MockMessageRepository implements IMessageRepository {
  private messages = new Map<string, Message>();

  async findAll() {
    return Array.from(this.messages.values());
  }

  async findById(id: string) {
    return this.messages.get(id) ?? null;
  }

  async findBySlug(_slug: string) {
    return null;
  }

  async findByConversationId(conversationId: string) {
    const messages = Array.from(this.messages.values());
    return messages.filter((m) => m.conversationId === conversationId);
  }

  async findByConversationIdPaginated(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    const messages = await this.findByConversationId(conversationId);
    return {
      messages: messages.slice(0, options.limit),
      nextCursor: null,
      hasMore: false,
    };
  }

  async create(entity: Message) {
    this.messages.set(entity.id, entity);
    return entity;
  }

  async update(entity: Message) {
    if (!this.messages.has(entity.id)) {
      throw new Error(`Message with id ${entity.id} not found`);
    }
    this.messages.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.messages.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

class MockConversationRepository implements IConversationRepository {
  private conversations = new Map<string, Conversation>();

  async findAll() {
    return Array.from(this.conversations.values());
  }

  async findById(id: string) {
    return this.conversations.get(id) ?? null;
  }

  async findBySlug(slug: string) {
    return (
      Array.from(this.conversations.values()).find((c) => c.slug === slug) ??
      null
    );
  }

  async findByProjectId(_projectId: string) {
    return [];
  }

  async findByTaskId(_taskId: string) {
    return [];
  }

  async create(entity: Conversation) {
    this.conversations.set(entity.id, entity);
    return entity;
  }

  async update(entity: Conversation) {
    if (!this.conversations.has(entity.id)) {
      throw new Error(`Conversation with id ${entity.id} not found`);
    }
    this.conversations.set(entity.id, entity);
    return entity;
  }

  async delete(id: string) {
    return this.conversations.delete(id);
  }

  shortenId(id: string) {
    return id.slice(0, 8);
  }
}

describe('CreateMessageService', () => {
  const conversationId = '550e8400-e29b-41d4-a716-446655440000';
  const conversationSlug = 'test-conversation';
  const userId = '550e8400-e29b-41d4-a716-446655440001';
  const projectId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
  const taskId = '7ba7b810-9dad-11d1-80b4-00c04fd430c8';

  it('should create a new message', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    // Setup conversation
    const originalUpdatedAt = new Date('2026-01-01T00:00:00.000Z');
    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId,
      taskId,
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: originalUpdatedAt,
      createdBy: userId,
      updatedBy: userId,
      isPublic: false,
    };
    await conversationRepository.create(conversation);

    const service = new CreateMessageService(
      messageRepository,
      conversationRepository,
    );

    const result = await service.execute({
      input: {
        content: { text: 'Hello, world!' },
        role: MessageRole.USER,
        metadata: { source: 'web' },
        createdBy: userId,
      },
      conversationSlug,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.isFailure).toBe(false);
    expect(result.value).toBeDefined();
    expect(result.value?.id).toBeDefined();
    expect(result.value?.conversationId).toBe(conversationId);
    expect(result.value?.content).toEqual({ text: 'Hello, world!' });
    expect(result.value?.role).toBe(MessageRole.USER);
    expect(result.value?.metadata).toEqual({ source: 'web' });
    expect(result.value?.createdBy).toBe(userId);
    expect(result.value?.createdAt).toBeInstanceOf(Date);
    expect(result.value?.updatedAt).toBeInstanceOf(Date);

    const updatedConversation =
      await conversationRepository.findById(conversationId);
    expect(updatedConversation?.updatedAt.getTime()).toBe(
      result.value?.updatedAt.getTime(),
    );
    expect(updatedConversation?.updatedAt.getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
    expect(updatedConversation?.updatedBy).toBe(userId);
  });

  it('should create message with default empty metadata when not provided', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId,
      taskId,
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      isPublic: false,
    };
    await conversationRepository.create(conversation);

    const service = new CreateMessageService(
      messageRepository,
      conversationRepository,
    );

    const result = await service.execute({
      input: {
        content: { text: 'Test' },
        role: MessageRole.ASSISTANT,
        createdBy: userId,
      },
      conversationSlug,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.value?.metadata).toEqual({});
  });

  it('should generate unique ids for different messages', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId,
      taskId,
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      isPublic: false,
    };
    await conversationRepository.create(conversation);

    const service = new CreateMessageService(
      messageRepository,
      conversationRepository,
    );

    const result1 = await service.execute({
      input: {
        content: { text: 'Message 1' },
        role: MessageRole.USER,
        createdBy: userId,
      },
      conversationSlug,
    });

    const result2 = await service.execute({
      input: {
        content: { text: 'Message 2' },
        role: MessageRole.ASSISTANT,
        createdBy: userId,
      },
      conversationSlug,
    });

    expect(result1.value?.id).not.toBe(result2.value?.id);
  });

  it('should create messages with different roles', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId,
      taskId,
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: userId,
      updatedBy: userId,
      isPublic: false,
    };
    await conversationRepository.create(conversation);

    const service = new CreateMessageService(
      messageRepository,
      conversationRepository,
    );

    const userMessage = await service.execute({
      input: {
        content: { text: 'User message' },
        role: MessageRole.USER,
        createdBy: userId,
      },
      conversationSlug,
    });

    const agentMessage = await service.execute({
      input: {
        content: { text: 'Agent message' },
        role: MessageRole.ASSISTANT,
        createdBy: userId,
      },
      conversationSlug,
    });

    const systemMessage = await service.execute({
      input: {
        content: { text: 'System message' },
        role: MessageRole.SYSTEM,
        createdBy: userId,
      },
      conversationSlug,
    });

    expect(userMessage.value?.role).toBe(MessageRole.USER);
    expect(agentMessage.value?.role).toBe(MessageRole.ASSISTANT);
    expect(systemMessage.value?.role).toBe(MessageRole.SYSTEM);
  });

  it('returns a failure result when the conversation does not exist', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const service = new CreateMessageService(
      messageRepository,
      conversationRepository,
    );

    const result = await service.execute({
      input: {
        content: { text: 'Missing conversation' },
        role: MessageRole.USER,
        createdBy: userId,
      },
      conversationSlug: 'missing-conversation',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.isFailure).toBe(true);
    expect(result.value).toBeUndefined();
    expect(result.error).toBeInstanceOf(ConversationNotFoundError);
    expect(result.error?.conversationSlug).toBe('missing-conversation');
  });
});
