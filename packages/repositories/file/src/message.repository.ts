import { v4 as uuidv4 } from 'uuid';
import type { Message } from '@qwery/domain/entities';
import {
  RepositoryFindOptions,
  PaginationOptions,
  PaginatedResult,
} from '@qwery/domain/common';
import { IMessageRepository } from '@qwery/domain/repositories';
import * as Storage from './storage.js';

const ENTITY = 'message';

type Row = Record<string, unknown>;

function serialize(message: Message): Row {
  return {
    id: message.id,
    conversationId: message.conversationId,
    content: message.content ?? {},
    role: message.role,
    metadata: message.metadata ?? {},
    createdAt: message.createdAt.toISOString(),
    updatedAt: message.updatedAt.toISOString(),
    createdBy: message.createdBy,
    updatedBy: message.updatedBy,
  };
}

function deserialize(row: Row): Message {
  return {
    id: row.id as string,
    conversationId: row.conversationId as string,
    content: (row.content as Record<string, unknown>) ?? {},
    role: row.role as Message['role'],
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(row.createdAt as string),
    updatedAt: new Date(row.updatedAt as string),
    createdBy: row.createdBy as string,
    updatedBy: row.updatedBy as string,
  };
}

function messageKey(
  conversationId: string,
  id: string,
): [string, string, string] {
  return [ENTITY, conversationId, id];
}

export class MessageRepository extends IMessageRepository {
  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    const keys = await Storage.list([ENTITY]);
    const items: Message[] = [];
    for (const key of keys) {
      if (key.length === 3) {
        const row = await Storage.read<Row>(key);
        items.push(deserialize(row));
      }
    }
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit ? items.slice(offset, offset + limit) : items.slice(offset);
  }

  async findById(id: string): Promise<Message | null> {
    const keys = await Storage.list([ENTITY]);
    for (const key of keys) {
      if (key.length === 3 && key[2] === id) {
        const row = await Storage.read<Row>(key);
        return deserialize(row);
      }
    }
    return null;
  }

  async findBySlug(_slug: string): Promise<Message | null> {
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    const keys = await Storage.list([ENTITY, conversationId]);
    const items = await Promise.all(
      keys.map((key) => Storage.read<Row>(key).then(deserialize)),
    );
    items.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return items;
  }

  async findByConversationIdPaginated(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    const all = await this.findByConversationId(conversationId);
    let filtered = all;
    if (options.cursor) {
      const cursorTime = new Date(options.cursor).getTime();
      filtered = all.filter((m) => m.createdAt.getTime() < cursorTime);
    }
    const sorted = filtered.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
    const slice = sorted.slice(0, options.limit + 1);
    const hasMore = slice.length > options.limit;
    const messages = slice.slice(0, options.limit).reverse();
    const nextCursor =
      messages.length > 0 && messages[0]
        ? messages[0].createdAt.toISOString()
        : null;
    return { messages, nextCursor, hasMore };
  }

  async create(entity: Message): Promise<Message> {
    const now = new Date();
    const entityWithId = {
      ...entity,
      id: entity.id || uuidv4(),
      createdAt: entity.createdAt || now,
      updatedAt: entity.updatedAt || now,
      metadata: entity.metadata ?? {},
    };
    const key = messageKey(entityWithId.conversationId, entityWithId.id);
    await Storage.write(key, serialize(entityWithId));
    return entityWithId;
  }

  async update(entity: Message): Promise<Message> {
    const existing = await this.findById(entity.id);
    if (!existing) {
      throw new Error(`Message with id ${entity.id} not found`);
    }
    const updated = {
      ...entity,
      updatedAt: entity.updatedAt || new Date(),
    };
    const key = messageKey(entity.conversationId, entity.id);
    await Storage.write(key, serialize(updated));
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.findById(id);
    if (!existing) return false;
    const key = messageKey(existing.conversationId, id);
    try {
      await Storage.remove(key);
      return true;
    } catch {
      /* istanbul ignore next - Storage.remove swallows errors */
      return false;
    }
  }
}
