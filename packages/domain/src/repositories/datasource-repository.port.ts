import { Datasource } from '../entities';
import { RepositoryPort } from './base-repository.port';

export abstract class IDatasourceRepository extends RepositoryPort<
  Datasource,
  string
> {
  public abstract findByProjectId(
    projectId: string,
  ): Promise<Datasource[] | null>;

  /**
   * Reveals (decrypts/retrieves) all secrets within a datasource configuration.
   */
  public abstract revealSecrets(
    config: Record<string, unknown>,
  ): Promise<Record<string, unknown>>;
}
