import type { Datasource } from '../entities/datasource.entity';
import { RepositoryPort } from './base-repository';

export abstract class IDatasourceRepository extends RepositoryPort<Datasource, string> {
  /** Reveal (decrypt) any secret values within a datasource configuration. */
  public abstract revealSecrets(config: Record<string, unknown>): Promise<Record<string, unknown>>;
}
