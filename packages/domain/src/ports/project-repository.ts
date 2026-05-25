import type { Project } from '../entities/project.entity';
import { RepositoryPort } from './base-repository';

/**
 * Projects are resolved by slug (the slugified canonical cwd) via the inherited
 * `findBySlug`. Datasources relate to projects many-to-many through a join, so
 * the membership operations live here rather than on the datasource port.
 */
export abstract class IProjectRepository extends RepositoryPort<Project, string> {
  /** Attach a datasource to a project. Idempotent. */
  public abstract attachDatasource(projectId: string, datasourceId: string): Promise<void>;

  /** Detach a datasource from a project. Idempotent. */
  public abstract detachDatasource(projectId: string, datasourceId: string): Promise<void>;

  /** Ids of the datasources attached to a project. */
  public abstract listDatasourceIds(projectId: string): Promise<string[]>;

  /** Projects a given datasource is attached to (for displaying attachments). */
  public abstract findByDatasourceId(datasourceId: string): Promise<Project[]>;
}
