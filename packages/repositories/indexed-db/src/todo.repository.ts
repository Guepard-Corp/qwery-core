import type { TodoItem } from '@qwery/domain/entities';
import { ITodoRepository } from '@qwery/domain/repositories';

const DB_NAME = 'qwery-todo';
const DB_VERSION = 1;
const STORE_NAME = 'todo';

export class TodoRepository extends ITodoRepository {
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
          db.createObjectStore(STORE_NAME, { keyPath: 'conversationId' });
        }
      };
    });

    return this.initPromise;
  }

  async findByConversationId(conversationId: string): Promise<TodoItem[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(conversationId);

      request.onerror = () => {
        reject(new Error(`Failed to fetch todo: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const row = request.result as
          | { conversationId: string; todos: TodoItem[] }
          | undefined;
        if (!row || !Array.isArray(row.todos)) {
          resolve([]);
          return;
        }
        resolve(row.todos);
      };
    });
  }

  async upsertByConversationId(
    conversationId: string,
    todos: TodoItem[],
  ): Promise<TodoItem[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ conversationId, todos });

      request.onerror = () => {
        reject(new Error(`Failed to upsert todo: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve(todos);
      };
    });
  }
}
