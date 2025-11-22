import { Organization } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class OrganizationRepositoryPort extends RepositoryPort<
  Organization,
  string
> {}
