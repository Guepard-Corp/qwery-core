import { v4 as uuidv4 } from 'uuid';

import {
  RepositoryFindOptions,
  PaginationOptions,
  PaginatedResult,
} from '@qwery/domain/common';
import type { Message } from '@qwery/domain/entities';
import { IMessageRepository } from '@qwery/domain/repositories';

const DB_NAME = 'qwery-messages';
const DB_VERSION = 2; // Incremented to add compound index for pagination
const STORE_NAME = 'messages';

export class MessageRepository extends IMessageRepository {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor(private databaseName: string = DB_NAME) {
    super();
  }

  private async init(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.databaseName, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(new Error(`Failed to open database: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion || 0;

        if (!db.objectStoreNames.contains(STORE_NAME)) {
          // Create new store
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          objectStore.createIndex('conversationId', 'conversationId', {
            unique: false,
          });
          // Create compound index for cursor-based pagination
          objectStore.createIndex(
            'conversationId_createdAt',
            ['conversationId', 'createdAt'],
            { unique: false },
          );
        } else if (oldVersion < 2) {
          // Migration: Add compound index to existing store
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const objectStore = transaction.objectStore(STORE_NAME);
            if (!objectStore.indexNames.contains('conversationId_createdAt')) {
              objectStore.createIndex(
                'conversationId_createdAt',
                ['conversationId', 'createdAt'],
                { unique: false },
              );
            }
          }
        }
      };
    });

    return this.initPromise;
  }

  private serialize(message: Message): Record<string, unknown> {
    return {
      ...message,
      createdAt: message.createdAt.toISOString(),
      updatedAt: message.updatedAt.toISOString(),
      conversationId: message.conversationId,
      metadata: JSON.stringify(message.metadata || {}),
    };
  }

  private deserialize(data: Record<string, unknown>): Message {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
      metadata: JSON.parse((data.metadata as string) || '{}') as Record<
        string,
        unknown
      >,
    } as Message;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Message[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onerror = () => {
        reject(
          new Error(`Failed to fetch messages: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        let results = (request.result as Record<string, unknown>[]).map(
          (item) => this.deserialize(item),
        );

        if (options?.order) {
          // Simple sorting - in a real implementation, you'd parse the order string
          const [field, direction] = options.order.split(' ');
          if (field) {
            results.sort((a, b) => {
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
          results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        }

        if (options?.offset) {
          results = results.slice(options.offset);
        }

        if (options?.limit) {
          results = results.slice(0, options.limit);
        }

        resolve(results);
      };
    });
  }

  async findById(id: string): Promise<Message | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onerror = () => {
        reject(new Error(`Failed to fetch message: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          resolve(null);
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findBySlug(_slug: string): Promise<Message | null> {
    // Messages don't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Message[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('conversationId');
      const request = index.getAll(conversationId);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to fetch messages by conversation: ${request.error?.message}`,
          ),
        );
      };

      request.onsuccess = () => {
        const results = (request.result as Record<string, unknown>[]).map(
          (item) => this.deserialize(item),
        );
        // Sort by createdAt ASC
        results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        resolve(results);
      };
    });
  }

  async findByConversationIdPaginated(
    conversationId: string,
    options: PaginationOptions,
  ): Promise<PaginatedResult<Message>> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);

      // Use compound index for efficient cursor-based queries
      const index = store.index('conversationId_createdAt');

      // Create range: [conversationId, cursor] exclusive upper bound
      const range = options.cursor
        ? IDBKeyRange.upperBound(
            [conversationId, options.cursor],
            true, // exclusive
          )
        : IDBKeyRange.upperBound([conversationId, '\uffff']);

      const request = index.openCursor(range, 'prev'); // prev = descending
      const results: Message[] = [];
      let count = 0;

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor && count < options.limit + 1) {
          // Filter by conversationId (index key is [conversationId, createdAt])
          const key = cursor.key as [string, string];
          if (key[0] === conversationId) {
            const message = this.deserialize(cursor.value);
            results.push(message);
            count++;
          }
          cursor.continue();
        } else {
          const hasMore = results.length > options.limit;
          const messages = results.slice(0, options.limit).reverse(); // Reverse to oldest-first

          // After reverse, messages[0] is the oldest (first message in chronological order)
          // This is the cursor for the next "before" query
          const nextCursor =
            messages.length > 0 && messages[0]
              ? messages[0].createdAt.toISOString()
              : null;

          resolve({ messages, nextCursor, hasMore });
        }
      };

      request.onerror = () => {
        reject(
          new Error(
            `Failed to fetch messages: ${request.error?.message || 'Unknown error'}`,
          ),
        );
      };
    });
  }

  async create(entity: Message): Promise<Message> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date();

      const entityWithId = {
        ...entity,
        id: entity.id || uuidv4(),
        createdAt: entity.createdAt || now,
        updatedAt: entity.updatedAt || now,
        metadata: entity.metadata || {},
      };

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const serialized = this.serialize(entityWithId);
      const request = store.add(serialized);

      request.onerror = () => {
        if (
          request.error?.name === 'ConstraintError' ||
          request.error?.code === 0
        ) {
          reject(
            new Error(`Message with id ${entityWithId.id} already exists`),
          );
        } else {
          reject(
            new Error(`Failed to create message: ${request.error?.message}`),
          );
        }
      };

      request.onsuccess = () => {
        resolve(entityWithId);
      };
    });
  }

  async update(entity: Message): Promise<Message> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const entityWithUpdatedAt = {
        ...entity,
        updatedAt: entity.updatedAt || new Date(),
      };

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const serialized = this.serialize(entityWithUpdatedAt);
      const request = store.put(serialized);

      request.onerror = () => {
        reject(
          new Error(`Failed to update message: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        resolve(entityWithUpdatedAt);
      };
    });
  }

  async delete(id: string): Promise<boolean> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onerror = () => {
        reject(
          new Error(`Failed to delete message: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  public shortenId(id: string): string {
    return super.shortenId(id);
  }
}
