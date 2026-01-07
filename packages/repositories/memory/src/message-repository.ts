import type { Nullable } from '@qwery/domain/common';
import type {
  RepositoryFindOptions,
  PaginationOptions,
  PaginatedResult,
} from '@qwery/domain/common';
import type { Message } from '@qwery/domain/entities';
import { IMessageRepository } from '@qwery/domain/repositories';

export class MessageRepository extends IMessageRepository {
  private messages = new Map<string, Message>();

  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    const allMessages = Array.from(this.messages.values());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;

    if (options?.order) {
      // Simple sorting - in a real implementation, you'd parse the order string
      const [field, direction] = options.order.split(' ');
      if (field) {
        allMessages.sort((a, b) => {
          const aVal = (a as Record<string, unknown>)[field];
          const bVal = (b as Record<string, unknown>)[field];
          if (aVal === bVal) return 0;
          // Convert to comparable types
          const aStr = String(aVal ?? '');
          const bStr = String(bVal ?? '');
          const comparison = aStr < bStr ? -1 : 1;
          return direction === 'DESC' ? -comparison : comparison;
        });
      }
    } else {
      // Default: sort by createdAt ASC
      allMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    if (limit) {
      return allMessages.slice(offset, offset + limit);
    }
    return allMessages.slice(offset);
  }

  async findById(id: string): Promise<Nullable<Message>> {
    return this.messages.get(id) ?? null;
  }

  async findBySlug(_slug: string): Promise<Nullable<Message>> {
    // Messages don't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const allMessages = Array.from(this.messages.values());
    const filtered = allMessages.filter(
      (message) => message.conversationId === conversationId,
    );
    // Sort by createdAt ASC
    filtered.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return filtered;
  }

  async findByConversationIdPaginated(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    const allMessages = Array.from(this.messages.values());
    let filtered = allMessages.filter(
      (message) => message.conversationId === conversationId,
    );

    // Filter by cursor if provided
    if (options.cursor) {
      const cursorDate = new Date(options.cursor);
      filtered = filtered.filter(
        (message) => message.createdAt.getTime() < cursorDate.getTime(),
      );
    }

    // Sort by createdAt DESC (newest-oldest), then reverse to oldest-first
    filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Take limit + 1 to check hasMore
    const hasMore = filtered.length > options.limit;
    const messages = filtered.slice(0, options.limit).reverse(); // Reverse to oldest-first

    // After reverse, messages[0] is the oldest (first message in chronological order)
    // This is the cursor for the next "before" query
    const nextCursor =
      messages.length > 0 && messages[0]
        ? messages[0].createdAt.toISOString()
        : null;

    return { messages, nextCursor, hasMore };
  }

  async create(entity: Message): Promise<Message> {
    this.messages.set(entity.id, entity);
    return entity;
  }

  async update(entity: Message): Promise<Message> {
    if (!this.messages.has(entity.id)) {
      throw new Error(`Message with id ${entity.id} not found`);
    }
    this.messages.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<boolean> {
    return this.messages.delete(id);
  }
}
