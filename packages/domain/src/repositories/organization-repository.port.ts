import { Organization } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IOrganizationRepository extends RepositoryPort<
  Organization,
  string
> {}
