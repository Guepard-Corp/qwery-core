import { Organization } from '../entities/organization.type';
import { RepositoryPort } from './base-repository.port';

export abstract class OrganizationRepositoryPort extends RepositoryPort<
  Organization,
  string
> {}
