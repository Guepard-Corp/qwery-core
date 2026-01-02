import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Usage } from '@qwery/domain/entities';
import { IUsageRepository } from '@qwery/domain/repositories';

const DB_NAME = 'qwery-usage';
const DB_VERSION = 1;
const STORE_NAME = 'usage';

export class UsageRepository extends IUsageRepository {
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
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const objectStore = db.createObjectStore(STORE_NAME, {
            keyPath: 'id',
          });
          objectStore.createIndex('conversationId', 'conversationId', {
            unique: false,
          });
        }
      };
    });

    return this.initPromise;
  }

  private serialize(usage: Usage): Record<string, unknown> {
    return {
      ...usage,
    };
  }

  private deserialize(data: Record<string, unknown>): Usage {
    return {
      ...data,
    } as Usage;
  }

  async findAll(options?: RepositoryFindOptions): Promise<Usage[]> {
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
        reject(new Error(`Failed to fetch usage: ${request.error?.message}`));
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
          // Default: sort by id DESC (newest first for time series data)
          results.sort((a, b) => b.id.localeCompare(a.id));
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

  async findById(id: string): Promise<Usage | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(Number(id));

      request.onerror = () => {
        reject(new Error(`Failed to fetch usage: ${request.error?.message}`));
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

  async findBySlug(_slug: string): Promise<Usage | null> {
    // Usage doesn't have slugs, but we need to implement this for the interface
    return null;
  }

  async findByConversationId(conversationId: string): Promise<Usage[]> {
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
            `Failed to fetch usage by conversation: ${request.error?.message}`,
          ),
        );
      };

      request.onsuccess = () => {
        const results = (request.result as Record<string, unknown>[]).map(
          (item) => this.deserialize(item),
        );
        // Sort by id DESC (newest first for time series data)
        results.sort((a, b) => b.id.localeCompare(a.id));
        resolve(results);
      };
    });
  }

  async findByConversationSlug(conversationSlug: string): Promise<Usage[]> {
    // First, get the conversation ID from the conversations database
    const CONVERSATIONS_DB_NAME = 'qwery-conversations';
    const CONVERSATIONS_STORE_NAME = 'conversations';

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONVERSATIONS_DB_NAME, 1);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to open conversations database: ${request.error?.message}`,
          ),
        );
      };

      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CONVERSATIONS_STORE_NAME)) {
          resolve([]);
          return;
        }

        const transaction = db.transaction(
          [CONVERSATIONS_STORE_NAME],
          'readonly',
        );
        const store = transaction.objectStore(CONVERSATIONS_STORE_NAME);
        const index = store.index('slug');
        const getRequest = index.get(conversationSlug);

        getRequest.onerror = () => {
          reject(
            new Error(
              `Failed to fetch conversation: ${getRequest.error?.message}`,
            ),
          );
        };

        getRequest.onsuccess = () => {
          const conversation = getRequest.result as { id: string } | undefined;
          db.close();

          if (!conversation) {
            resolve([]);
            return;
          }

          // Then find usage by conversation ID
          this.findByConversationId(conversation.id)
            .then(resolve)
            .catch(reject);
        };
      };

      request.onupgradeneeded = () => {
        // Database doesn't exist or needs upgrade, conversation not found
        resolve([]);
      };
    });
  }

  async create(entity: Usage): Promise<Usage> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const entityWithId = {
        ...entity,
        id: entity.id || crypto.randomUUID(),
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
          reject(new Error(`Usage with id ${entityWithId.id} already exists`));
        } else {
          reject(
            new Error(`Failed to create usage: ${request.error?.message}`),
          );
        }
      };

      request.onsuccess = () => {
        resolve(entityWithId);
      };
    });
  }

  async update(entity: Usage): Promise<Usage> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const serialized = this.serialize(entity);
      const request = store.put(serialized);

      request.onerror = () => {
        reject(new Error(`Failed to update usage: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(entity);
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
      const request = store.delete(Number(id));

      request.onerror = () => {
        reject(new Error(`Failed to delete usage: ${request.error?.message}`));
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
