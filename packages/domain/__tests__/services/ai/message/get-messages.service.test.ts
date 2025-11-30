import { describe, expect, it } from 'vitest';
import type { Conversation, Message } from '../../../../src/entities';
import { MessageRole } from '../../../../src/entities';
import {
  IConversationRepository,
  IMessageRepository,
} from '../../../../src/repositories';
import {
  GetMessagesByConversationIdService,
  GetMessagesByConversationSlugService,
} from '../../../../src/services/ai/message/get-messages.service';
import { DomainException } from '../../../../src/exceptions';

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

describe('GetMessagesByConversationIdService', () => {
  it('should return all messages when no conversationId provided', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessagesByConversationIdService(repository);

    const message1: Message = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      conversationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: { text: 'Message 1' },
      role: MessageRole.USER,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    const message2: Message = {
      id: '6ba7b810-9dad-11d1-80b4-00c04fd430c9',
      conversationId: '6ba7b810-9dad-11d1-80b4-00c04fd431c8',
      content: { text: 'Message 2' },
      role: MessageRole.ASSISTANT,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(message1);
    await repository.create(message2);

    const result = await service.execute({});

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain(message1.id);
    expect(result.map((m) => m.id)).toContain(message2.id);
  });

  it('should return empty array when no messages exist', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessagesByConversationIdService(repository);

    const result = await service.execute({});

    expect(result).toEqual([]);
  });

  it('should return messages filtered by conversationId', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessagesByConversationIdService(repository);

    const conversationId1 = '550e8400-e29b-41d4-a716-446655440000';
    const conversationId2 = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

    const message1: Message = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      conversationId: conversationId1,
      content: { text: 'Message 1' },
      role: MessageRole.USER,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    const message2: Message = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      conversationId: conversationId1,
      content: { text: 'Message 2' },
      role: MessageRole.ASSISTANT,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    const message3: Message = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      conversationId: conversationId2,
      content: { text: 'Message 3' },
      role: MessageRole.USER,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(message1);
    await repository.create(message2);
    await repository.create(message3);

    const result = await service.execute({ conversationId: conversationId1 });

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain(message1.id);
    expect(result.map((m) => m.id)).toContain(message2.id);
    expect(result.map((m) => m.id)).not.toContain(message3.id);
  });

  it('should return empty array when conversationId has no messages', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessagesByConversationIdService(repository);

    const message: Message = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      conversationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: { text: 'Message' },
      role: MessageRole.USER,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(message);

    const result = await service.execute({
      conversationId: 'nonexistent-conversation-id',
    });

    expect(result).toEqual([]);
  });
});

describe('GetMessagesByConversationSlugService', () => {
  it('should return messages for a conversation by slug', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();
    const service = new GetMessagesByConversationSlugService(
      messageRepository,
      conversationRepository,
    );

    const conversation: Conversation = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      slug: 'test-conversation',
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

    const message1: Message = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      conversationId: conversation.id,
      content: { text: 'Message 1' },
      role: MessageRole.USER,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    const message2: Message = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      conversationId: conversation.id,
      content: { text: 'Message 2' },
      role: MessageRole.ASSISTANT,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await messageRepository.create(message1);
    await messageRepository.create(message2);

    const result = await service.execute({
      conversationSlug: 'test-conversation',
    });

    expect(result).toHaveLength(2);
    expect(result.map((m) => m.id)).toContain(message1.id);
    expect(result.map((m) => m.id)).toContain(message2.id);
  });

  it('should throw error when conversation slug not found', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();
    const service = new GetMessagesByConversationSlugService(
      messageRepository,
      conversationRepository,
    );

    await expect(
      service.execute({ conversationSlug: 'nonexistent-slug' }),
    ).rejects.toThrow(DomainException);
  });

  it('should return empty array when conversation has no messages', async () => {
    const messageRepository = new MockMessageRepository();
    const conversationRepository = new MockConversationRepository();
    const service = new GetMessagesByConversationSlugService(
      messageRepository,
      conversationRepository,
    );

    const conversation: Conversation = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      slug: 'empty-conversation',
      projectId: 'project-id',
      taskId: 'task-id',
      title: 'Empty Conversation',
      datasources: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await conversationRepository.create(conversation);

    const result = await service.execute({
      conversationSlug: 'empty-conversation',
    });

    expect(result).toEqual([]);
  });
});
