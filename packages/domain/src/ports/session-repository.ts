import type { Session } from '../entities/session.entity';
import { RepositoryPort } from './base-repository';

export abstract class ISessionRepository extends RepositoryPort<Session, string> {
  /** Sessions that reference a given datasource id. */
  public abstract findByDatasourceId(datasourceId: string): Promise<Session[]>;

  /** Sessions belonging to a given project (working directory). */
  public abstract findByProjectId(projectId: string): Promise<Session[]>;
}
