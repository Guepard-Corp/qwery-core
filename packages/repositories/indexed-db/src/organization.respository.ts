import { v4 as uuidv4 } from 'uuid';

import type { Organization } from '@qwery/domain/entities';
import { IOrganizationRepository } from '@qwery/domain/repositories';
import type { RepositoryFindOptions } from '@qwery/domain/common';

const DB_NAME = 'qwery-organizations';
const DB_VERSION = 1;
const STORE_NAME = 'organizations';

export class OrganizationRepository extends IOrganizationRepository {
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
          objectStore.createIndex('slug', 'slug', { unique: false });
          objectStore.createIndex('billing_email', 'billing_email', {
            unique: false,
          });
        }
      };
    });

    return this.initPromise;
  }

  private serialize(organization: Organization): Record<string, unknown> {
    return {
      ...organization,
      createdAt: organization.createdAt.toISOString(),
      updatedAt: organization.updatedAt.toISOString(),
    };
  }

  private deserialize(data: Record<string, unknown>): Organization {
    return {
      ...data,
      createdAt: new Date(data.createdAt as string),
      updatedAt: new Date(data.updatedAt as string),
    } as Organization;
  }

  async search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]> {
    const q = query.trim().toLowerCase();
    const all = await this.findAll();
    const filtered = q
      ? all.filter((org) => {
          const name = org.name?.toLowerCase() ?? '';
          const slug = org.slug?.toLowerCase() ?? '';
          return name.includes(q) || slug.includes(q);
        })
      : all;

    const offset = options?.offset ?? 0;
    const limit = options?.limit;
    return limit ? filtered.slice(offset, offset + limit) : filtered.slice(offset);
  }

  async findAll(): Promise<Organization[]> {
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
          new Error(`Failed to fetch organizations: ${request.error?.message}`),
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

  async findById(id: string): Promise<Organization> {
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
          new Error(`Failed to fetch organization: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Organization with id ${id} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async findBySlug(slug: string): Promise<Organization> {
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
          new Error(`Failed to fetch organization: ${request.error?.message}`),
        );
      };

      request.onsuccess = () => {
        const result = request.result;
        if (!result) {
          reject(new Error(`Organization with slug ${slug} not found`));
          return;
        }
        resolve(this.deserialize(result as Record<string, unknown>));
      };
    });
  }

  async create(entity: Organization): Promise<Organization> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const now = new Date();
      const userId = 'system';

      // Auto-generate id and set timestamps/user fields if not provided
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
            new Error(`Organization with id ${entityWithId.id} already exists`),
          );
        } else {
          reject(
            new Error(
              `Failed to create organization: ${request.error?.message}`,
            ),
          );
        }
      };

      request.onsuccess = () => {
        resolve(entityWithSlug);
      };
    });
  }

  async update(entity: Organization): Promise<Organization> {
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
          new Error(`Failed to update organization: ${request.error?.message}`),
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
          new Error(`Failed to delete organization: ${request.error?.message}`),
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
