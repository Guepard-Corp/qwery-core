import { Project } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class ProjectRepositoryPort extends RepositoryPort<
  Project,
  string
> {}
