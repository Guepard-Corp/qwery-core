import { Organization } from '../entities';
import type { RepositoryFindOptions } from '../common/repository-options';
import { RepositoryPort } from './base-repository.port';

export abstract class IOrganizationRepository extends RepositoryPort<
  Organization,
  string
> {
  public abstract search(
    query: string,
    options?: RepositoryFindOptions,
  ): Promise<Organization[]>;
}
