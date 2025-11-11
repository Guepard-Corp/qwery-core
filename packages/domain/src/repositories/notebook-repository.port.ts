import { Notebook } from '../entities/notebook.type';
import { RepositoryPort } from './base-repository.port';

export abstract class NotebookRepositoryPort extends RepositoryPort<
  Notebook,
  string
> {
  public abstract findByProjectId(projectId: string): Promise<Notebook | null>;
}
