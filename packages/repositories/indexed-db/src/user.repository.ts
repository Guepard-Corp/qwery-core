import { v4 as uuidv4 } from 'uuid';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { User } from '@qwery/domain/entities';
import { UserRepositoryPort } from '@qwery/domain/repositories';

const DB_NAME = 'qwery-users';
const DB_VERSION = 1;
const STORE_NAME = 'users';

export class UserRepository extends UserRepositoryPort {
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
          objectStore.createIndex('username', 'username', { unique: true });
        }
      };
    });

    return this.initPromise;
  }

  private serialize(user: User): Record<string, unknown> {
    return {
      ...user,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, unknown>): User {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    } as User;
  }

  async findAll(options?: RepositoryFindOptions): Promise<User[]> {
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
        reject(new Error(`Failed to fetch users: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        let results = (request.result as Record<string, unknown>[]).map(
          (item) => this.deserialize(item),
        );

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

  async findById(id: string): Promise<User | null> {
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
        reject(new Error(`Failed to fetch user: ${request.error?.message}`));
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

  async findBySlug(slug: string): Promise<User | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('username');
      const request = index.get(slug);

      request.onerror = () => {
        reject(new Error(`Failed to fetch user: ${request.error?.message}`));
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

  async create(entity: User): Promise<User> {
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
          reject(new Error(`User with id ${entityWithId.id} already exists`));
        } else {
          reject(new Error(`Failed to create user: ${request.error?.message}`));
        }
      };

      request.onsuccess = () => {
        resolve(entityWithId);
      };
    });
  }

  async update(entity: User): Promise<User> {
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
        reject(new Error(`Failed to update user: ${request.error?.message}`));
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
        reject(new Error(`Failed to delete user: ${request.error?.message}`));
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
