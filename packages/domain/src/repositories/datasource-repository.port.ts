import { Datasource } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IDatasourceRepository extends RepositoryPort<
  Datasource,
  string
> {
  public abstract findByProjectId(
    projectId: string,
  ): Promise<Datasource[] | null>;
}
