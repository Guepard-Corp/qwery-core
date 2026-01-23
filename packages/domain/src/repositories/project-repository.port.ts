import { Project } from '../entities';
import type { RepositoryFindOptions } from '../common/repository-options';
import { RepositoryPort } from './base-repository.port';

export abstract class IProjectRepository extends RepositoryPort<
  Project,
  string
> {
  public abstract findAllByOrganizationId(orgId: string): Promise<Project[]>;

  public abstract search(
    query: string,
    options?: RepositoryFindOptions & { organizationId?: string },
  ): Promise<Project[]>;
}
