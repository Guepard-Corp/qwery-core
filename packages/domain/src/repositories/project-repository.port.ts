import { Project } from '../entities/project.type';
import { RepositoryPort } from './base-repository.port';

export abstract class ProjectRepositoryPort extends RepositoryPort<
  Project,
  string
> {}
