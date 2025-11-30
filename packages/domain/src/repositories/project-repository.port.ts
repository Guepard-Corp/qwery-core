import { Project } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IProjectRepository extends RepositoryPort<
  Project,
  string
> {}
