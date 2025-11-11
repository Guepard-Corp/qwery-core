import { v4 as uuidv4 } from 'uuid';

import type { Notebook } from '@qwery/domain/entities';
import { NotebookRepositoryPort } from '@qwery/domain/repositories';

const DB_NAME = 'qwery-notebooks';
const DB_VERSION = 2;
const STORE_NAME = 'notebooks';
const VERSIONS_STORE_NAME = 'notebook_versions';

export class NotebookRepository extends NotebookRepositoryPort {
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
          objectStore.createIndex('project_id', 'projectId', { unique: false });
          objectStore.createIndex('slug', 'slug', { unique: false });
        }
        if (!db.objectStoreNames.contains(VERSIONS_STORE_NAME)) {
          const versionsStore = db.createObjectStore(VERSIONS_STORE_NAME, {
            keyPath: 'versionId',
          });
          versionsStore.createIndex('notebook_id', 'notebookId', {
            unique: false,
          });
          versionsStore.createIndex('version', 'version', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private serialize(notebook: Notebook): Record<string, unknown> {
    return {
      ...notebook,
      createdAt: notebook.createdAt.toISOString(),
      updatedAt: notebook.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, unknown>): Notebook {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    } as Notebook;
  }

  async findAll(): Promise<Notebook[]> {
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
          new Error(`Failed to fetch notebooks: ${request.error?.message}`),
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

  async findById(id: string): Promise<Notebook> {
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
          new Error(`Failed to fetch notebook: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Notebook with id ${id} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findBySlug(slug: string): Promise<Notebook> {
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
          new Error(`Failed to fetch notebook: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Notebook with slug ${slug} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findByProjectId(projectId: string): Promise<Notebook | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('project_id');
      const request = index.get(projectId);

      request.onerror = () => {
        reject(
          new Error(`Failed to fetch notebook: ${request.error?.message}`),
        );
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

  async create(entity: Notebook): Promise<Notebook> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date();

      // Auto-generate ID and set timestamps if not provided
      const entityWithId = {
        ...entity,
        id: entity.id || uuidv4(),
        createdAt: entity.createdAt || now,
        updatedAt: entity.updatedAt || now,
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
            new Error(`Notebook with id ${entityWithId.id} already exists`),
          );
        } else {
          reject(
            new Error(`Failed to create notebook: ${request.error?.message}`),
          );
        }
      };

      request.onsuccess = () => {
        resolve(entityWithSlug);
      };
    });
  }

  async update(entity: Notebook): Promise<Notebook> {
    await this.init();

    // First, fetch the current version to save it
    const currentNotebook = await this.findById(entity.id);

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction(
        [STORE_NAME, VERSIONS_STORE_NAME],
        'readwrite',
      );
      const store = transaction.objectStore(STORE_NAME);
      const versionsStore = transaction.objectStore(VERSIONS_STORE_NAME);

      // Save current version to versions store (using put for idempotency)
      const versionData = {
        versionId: `${currentNotebook.id}-${currentNotebook.version}`,
        notebookId: currentNotebook.id,
        version: currentNotebook.version,
        data: this.serialize(currentNotebook),
        savedAt: new Date().toISOString(),
      };
      versionsStore.put(versionData);

      // Increment version and update timestamp
      const updatedEntity: Notebook = {
        ...entity,
        createdAt: currentNotebook.createdAt, // preserve original creation date
        version: currentNotebook.version + 1,
        updatedAt: new Date(),
        slug: this.shortenId(entity.id),
      };

      const serialized = this.serialize(updatedEntity);
      const request = store.put(serialized);

      request.onerror = () => {
        reject(
          new Error(`Failed to update notebook: ${request.error?.message}`),
        );
      };

      transaction.onerror = () => {
        reject(
          new Error(`Failed to update notebook: ${transaction.error?.message}`),
        );
      };

      request.onsuccess = () => {
        resolve(updatedEntity);
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
          new Error(`Failed to delete notebook: ${request.error?.message}`),
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
