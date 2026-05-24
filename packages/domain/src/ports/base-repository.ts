import type { Nullable } from '../common/common-types';
import type { RepositoryFindOptions } from '../common/repository-options';
import { shortenId } from '../utils/shorten-id';

/**
 * Generic repository port — every concrete repository implements CRUD against
 * an entity identified by a string id (UUID). Slugs are short IDs derived
 * deterministically via `shortenId`.
 */
export abstract class RepositoryPort<T, ID extends string> {
  abstract findAll(options?: RepositoryFindOptions): Promise<T[]>;
  abstract findById(id: ID): Promise<Nullable<T>>;
  abstract findBySlug(slug: string): Promise<Nullable<T>>;
  abstract create(entity: T): Promise<T>;
  abstract update(entity: T): Promise<T>;
  abstract delete(id: ID): Promise<boolean>;

  public shortenId(id: ID): string {
    return shortenId(id);
  }
}
