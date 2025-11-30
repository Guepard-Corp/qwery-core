import type { Nullable } from '@qwery/domain/common';
import type { RepositoryFindOptions } from '@qwery/domain/common';
import type { Conversation } from '@qwery/domain/entities';
import { IConversationRepository } from '@qwery/domain/repositories';

export class ConversationRepository extends IConversationRepository {
  private conversations = new Map<string, Conversation>();

  async findAll(options?: RepositoryFindOptions): Promise<Conversation[]> {
    const allConversations = Array.from(this.conversations.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (limit) {
      return allConversations.slice(offset, offset + limit);
    }
    return allConversations.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Conversation>> {
    return this.conversations.get(id) ?? null;
  }

  async findBySlug(slug: string): Promise<Nullable<Conversation>> {
    const conversations = Array.from(this.conversations.values());
    return (
      conversations.find((conversation) => conversation.slug === slug) ?? null
    );
  }

  async findByProjectId(projectId: string): Promise<Conversation[]> {
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(
      (conversation) => conversation.projectId === projectId,
    );
  }

  async findByTaskId(taskId: string): Promise<Conversation[]> {
    const conversations = Array.from(this.conversations.values());
    return conversations.filter(
      (conversation) => conversation.taskId === taskId,
    );
  }

  async create(entity: Conversation): Promise<Conversation> {
    this.conversations.set(entity.id, entity);
    return entity;
  }

  async update(entity: Conversation): Promise<Conversation> {
    if (!this.conversations.has(entity.id)) {
      throw new Error(`Conversation with id ${entity.id} not found`);
    }
    this.conversations.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.conversations.delete(id);
  }
}
