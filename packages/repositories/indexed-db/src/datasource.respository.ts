import { v4 as uuidv4 } from 'uuid';

import { RepositoryFindOptions } from '@qwery/domain/common';
import type { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';

const DB_VERSION = 2;
const STORE_NAME = 'datasources';
const DB_NAME = 'qwery-datasources';

export class DatasourceRepository extends IDatasourceRepository {
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
          objectStore.createIndex('projectId', 'projectId', { unique: false });
          objectStore.createIndex('slug', 'slug', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private serialize(datasource: Datasource): Record<string, unknown> {
    return {
      ...datasource,
      createdAt: datasource.createdAt?.toISOString(),
      updatedAt: datasource.updatedAt?.toISOString(),
    };
  }

  private deserialize(data: Record<string, unknown>): Datasource {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    } as Datasource;
  }

  async findAll(_options?: RepositoryFindOptions): Promise<Datasource[]> {
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
          new Error(`Failed to fetch datasources: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const results = (request.result as Record<string, unknown>[]).map(
          (item) => this.deserialize(item),
        );
        resolve(results);
      };
    });
  }

  async findById(id: string): Promise<Datasource> {
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
        reject(
          new Error(`Failed to fetch datasource: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Datasource with id ${id} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findBySlug(slug: string): Promise<Datasource> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('slug');
      const request = index.get(slug);

      request.onerror = () => {
        reject(
          new Error(`Failed to fetch datasource: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Datasource with slug ${slug} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findByProjectId(projectId: string): Promise<Datasource[] | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('projectId');
      const request = index.getAll(projectId);

      request.onerror = () => {
        reject(
          new Error(`Failed to fetch datasources: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const results = request.result as Record<string, unknown>[];
        if (!results || results.length === 0) {
          resolve(null);
          return;
        }
        const datasources = results.map((item) => this.deserialize(item));
        resolve(datasources);
      };
    });
  }

  async create(entity: Datasource): Promise<Datasource> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date();
      const userId = 'system';

      // Auto-generate ID and set timestamps/user fields if not provided
      const entityWithId = {
        ...entity,
        id: entity.id || uuidv4(),
        createdAt: entity.createdAt || now,
        updatedAt: entity.updatedAt || now,
        createdBy: entity.createdBy || userId,
        updatedBy: entity.updatedBy || userId,
      };

      const entityWithSlug = {
        ...entityWithId,
        slug: this.shortenId(entityWithId.id),
      };

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const serialized = this.serialize(entityWithSlug);
      const request = store.add(serialized);

      request.onerror = () => {
        if (
          request.error?.name === 'ConstraintError' ||
          request.error?.code === 0
        ) {
          reject(
            new Error(`Datasource with id ${entityWithId.id} already exists`),
          );
        } else {
          reject(
            new Error(`Failed to create datasource: ${request.error?.message}`),
          );
        }
      };

      request.onsuccess = () => {
        resolve(entityWithSlug);
      };
    });
  }

  async update(entity: Datasource): Promise<Datasource> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const userId = 'system';

      const entityWithSlug = {
        ...entity,
        updatedAt: entity.updatedAt || new Date(),
        updatedBy: entity.updatedBy || userId,
        slug: this.shortenId(entity.id || ''),
      };

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const serialized = this.serialize(entityWithSlug);
      const request = store.put(serialized);

      request.onerror = () => {
        reject(
          new Error(`Failed to update datasource: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        resolve(entityWithSlug);
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
          new Error(`Failed to delete datasource: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        resolve(true);
      };
    });
  }

  async revealSecrets(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return config;
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
