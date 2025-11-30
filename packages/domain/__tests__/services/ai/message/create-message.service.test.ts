import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '../../../../src/entities';
import { MessageRole } from '../../../../src/entities';
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

  it('should create a new message', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    // Setup conversation
    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId: 'project-id',
      taskId: 'task-id',
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
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
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
    expect(result.conversationId).toBe(conversationId);
    expect(result.content).toEqual({ text: 'Hello, world!' });
    expect(result.role).toBe(MessageRole.USER);
    expect(result.metadata).toEqual({ source: 'web' });
    expect(result.createdBy).toBe('user-id');
    expect(result.createdAt).toBeInstanceOf(Date);
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it('should create message with default empty metadata when not provided', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId: 'project-id',
      taskId: 'task-id',
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
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
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    expect(result.metadata).toEqual({});
  });

  it('should generate unique ids for different messages', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId: 'project-id',
      taskId: 'task-id',
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
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
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    const result2 = await service.execute({
      input: {
        content: { text: 'Message 2' },
        role: MessageRole.ASSISTANT,
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    expect(result1.id).not.toBe(result2.id);
  });

  it('should create messages with different roles', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();

    const conversation: Conversation = {
      id: conversationId,
      slug: conversationSlug,
      projectId: 'project-id',
      taskId: 'task-id',
      title: 'Test Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
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
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    const agentMessage = await service.execute({
      input: {
        content: { text: 'Agent message' },
        role: MessageRole.ASSISTANT,
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    const systemMessage = await service.execute({
      input: {
        content: { text: 'System message' },
        role: MessageRole.SYSTEM,
        createdBy: 'user-id',
      },
      conversationSlug,
    });

    expect(userMessage.role).toBe(MessageRole.USER);
    expect(agentMessage.role).toBe(MessageRole.ASSISTANT);
    expect(systemMessage.role).toBe(MessageRole.SYSTEM);
  });
});
