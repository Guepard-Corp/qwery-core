import { describe, expect, it } from 'vitest';
import { DomainException } from '../../../../src/exceptions';
import type { Message } from '../../../../src/entities';
import { MessageRole } from '../../../../src/entities';
import { IMessageRepository } from '../../../../src/repositories';
import { GetMessageService } from '../../../../src/services/ai/message/get-message.service';

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

describe('GetMessageService', () => {
  it('should return message when found', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessageService(repository);

    const message: Message = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      conversationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: { text: 'Hello' },
      role: MessageRole.USER,
      metadata: {},
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'user-id',
      updatedBy: 'user-id',
    };

    await repository.create(message);

    const result = await service.execute(message.id);

    expect(result).toBeDefined();
    expect(result.id).toBe(message.id);
    expect(result.conversationId).toBe(message.conversationId);
    expect(result.content).toEqual(message.content);
    expect(result.role).toBe(message.role);
  });

  it('should throw DomainException when message not found', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessageService(repository);

    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      DomainException,
    );
    await expect(service.execute('nonexistent-id')).rejects.toThrow(
      "Message with id 'nonexistent-id' not found",
    );
  });

  it('should return message with all properties', async () => {
    const repository = new MockMessageRepository();
    const service = new GetMessageService(repository);

    const message: Message = {
      id: '550e8400-e29b-41d4-a716-446655440000',
      conversationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      content: { text: 'Test message', type: 'text' },
      role: MessageRole.ASSISTANT,
      metadata: { source: 'api', timestamp: '2024-01-01' },
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02'),
      createdBy: 'user1',
      updatedBy: 'user2',
    };

    await repository.create(message);

    const result = await service.execute(message.id);

    expect(result.id).toBe(message.id);
    expect(result.conversationId).toBe(message.conversationId);
    expect(result.content).toEqual(message.content);
    expect(result.role).toBe(message.role);
    expect(result.metadata).toEqual(message.metadata);
    expect(result.createdAt).toEqual(message.createdAt);
    expect(result.updatedAt).toEqual(message.updatedAt);
    expect(result.createdBy).toBe(message.createdBy);
    expect(result.updatedBy).toBe(message.updatedBy);
  });
});
