import { Notebook } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class INotebookRepository extends RepositoryPort<
  Notebook,
  string
> {
  public abstract findByProjectId(
    projectId: string,
  ): Promise<Notebook[] | null>;
}
