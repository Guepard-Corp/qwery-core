import { Nullable } from '../common/common-types';
import { RepositoryFindOptions } from '../common/repository-options';
import { shortenId } from '../utils/shorten-id';

/**
 * Repository port interface
 * @template T - The type of the entity
 * @template ID - The type of the id
 * @abstract
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
