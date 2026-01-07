import {
  RepositoryFindOptions,
  PaginationOptions,
  PaginatedResult,
} from '@qwery/domain/common';
import type { Message } from '@qwery/domain/entities';
import { IMessageRepository } from '@qwery/domain/repositories';
import { apiGet, apiPost } from './api-client';

export class MessageRepository extends IMessageRepository {
  async findAll(_options?: RepositoryFindOptions): Promise<Message[]> {
    // Messages can only be fetched by conversation, not all at once
    return [];
  }

  async findById(_id: string): Promise<Message | null> {
    // Messages cannot be fetched by ID directly
    return null;
  }

  async findBySlug(_slug: string): Promise<Message | null> {
    // Messages don't have slugs
    return null;
  }

  async findByConversationId(_conversationId: string): Promise<Message[]> {
    // This method is called by services that have conversationId
    // However, the frontend API only accepts conversationSlug
    // Services should use conversationSlug directly for frontend API calls
    // For now, this will fail - services need to be updated to use slug
    throw new Error(
      'Frontend API repository requires conversationSlug, not conversationId. Use findByConversationSlug instead.',
    );
  }

  /**
   * Find messages by conversation slug (frontend API method)
   * This is the preferred method for frontend API repository
   */
  async findByConversationSlug(conversationSlug: string): Promise<Message[]> {
    const result = await apiGet<Message[]>(
      `/messages?conversationSlug=${conversationSlug}`,
      false,
    );
    return result || [];
  }

  /**
   * Find messages by conversation ID with pagination (frontend API method)
   * Uses cursor-based pagination to fetch older messages
   */
  async findByConversationIdPaginated(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    const params = new URLSearchParams({
      conversationSlug: conversationId,
    });
    if (options.cursor) {
      params.append('cursor', options.cursor);
    }
    params.append('limit', String(options.limit));

    const result = await apiGet<PaginatedResult<Message>>(
      `/messages?${params.toString()}`,
      false,
      {
        timeout: 30000, // 30 second timeout
      },
    );

    if (!result) {
      return { messages: [], nextCursor: null, hasMore: false };
    }

    return result;
  }

  async create(entity: Message): Promise<Message> {
    // Extract CreateMessageInput from Message entity
    const {
      id: _id,
      conversationId,
      createdAt: _createdAt,
      updatedAt: _updatedAt,
      updatedBy: _updatedBy,
      ...input
    } = entity;

    // Call the API with conversationId (API will resolve to slug internally)
    const result = await apiPost<Message>('/messages', {
      conversationId,
      content: input.content,
      role: input.role,
      metadata: input.metadata,
      createdBy: input.createdBy,
    });

    return result;
  }

  async update(_entity: Message): Promise<Message> {
    throw new Error('Message update is handled by agents, not the frontend');
  }

  async delete(_id: string): Promise<boolean> {
    throw new Error('Message deletion is handled by agents, not the frontend');
  }
}
