import { v4 as uuidv4 } from 'uuid';

import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';
import type { RepositoryFindOptions } from '@qwery/domain/common';

const DB_NAME = 'qwery-projects';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

export class ProjectRepository extends IProjectRepository {
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
          objectStore.createIndex('organization_id', 'organizationId', {
            unique: false,
          });
          objectStore.createIndex('slug', 'slug', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  private serialize(project: Project): Record<string, unknown> {
    return {
      ...project,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, unknown>): Project {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    } as Project;
  }

  async search(
    query: string,
    options?: RepositoryFindOptions & { organizationId?: string },
  ): Promise<Project[]> {
    const q = query.trim().toLowerCase();
    const all = await this.findAll();
    const scoped = options?.organizationId
      ? all.filter((p) => p.organizationId === options.organizationId)
      : all;

    const filtered = q
      ? scoped.filter((project) => {
          const name = project.name?.toLowerCase() ?? '';
          const slug = project.slug?.toLowerCase() ?? '';
          const description = project.description?.toLowerCase() ?? '';
          return (
            name.includes(q) || slug.includes(q) || description.includes(q)
          );
        })
      : scoped;

    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit ? filtered.slice(offset, offset + limit) : filtered.slice(offset);
  }

  async findAll(): Promise<Project[]> {
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
          new Error(`Failed to fetch projects: ${request.error?.message}`),
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

  async findById(id: string): Promise<Project> {
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
        reject(new Error(`Failed to fetch project: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Project with id ${id} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findBySlug(slug: string): Promise<Project> {
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
        reject(new Error(`Failed to fetch project: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Project with slug ${slug} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findAllByOrganizationId(orgId: string): Promise<Project[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('organization_id');
      const request = index.getAll(orgId);

      request.onerror = () => {
        reject(
          new Error(
            `Failed to fetch projects by organization: ${request.error?.message}`,
          ),
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

  async create(entity: Project): Promise<Project> {
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
            new Error(`Project with id ${entityWithId.id} already exists`),
          );
        } else {
          reject(
            new Error(`Failed to create project: ${request.error?.message}`),
          );
        }
      };

      request.onsuccess = () => {
        resolve(entityWithSlug);
      };
    });
  }

  async update(entity: Project): Promise<Project> {
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
        slug: this.shortenId(entity.id),
      };

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const serialized = this.serialize(entityWithSlug);
      const request = store.put(serialized);

      request.onerror = () => {
        reject(
          new Error(`Failed to update project: ${request.error?.message}`),
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
          new Error(`Failed to delete project: ${request.error?.message}`),
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
