import type { Artifact, ArtifactType, QueryArtifact } from '../entities/artifact.entity';
import { RepositoryPort } from './base-repository';

/**
 * Artifact repository — persists all artifact variants under
 * `./.qwery/storage/artifact/<type>/<id>.json` (ADR #27, project-scoped).
 *
 * `findAll` etc. operate across types; the typed queries below filter by variant
 * so use cases can target a single artifact kind without runtime guards.
 */
export abstract class IArtifactRepository extends RepositoryPort<Artifact, string> {
  public abstract findByType<T extends ArtifactType>(type: T): Promise<Extract<Artifact, { type: T }>[]>;

  public abstract findByTag(tag: string): Promise<Artifact[]>;

  public abstract findByDatasourceId(datasourceId: string): Promise<Artifact[]>;

  /** Keyword-based search across title, description, tags, sql (ADR U11). */
  public abstract search(
    query: string,
    options?: { limit?: number; type?: ArtifactType },
  ): Promise<Artifact[]>;
}

/**
 * Helper typed accessor for the QueryArtifact variant — adapters MAY implement
 * a narrower interface that returns QueryArtifact directly when callers know
 * they're in the query domain (cheaper than runtime filtering of the union).
 */
export interface IQueryArtifactRepository {
  list(): Promise<QueryArtifact[]>;
  get(id: string): Promise<QueryArtifact | null>;
  save(artifact: QueryArtifact): Promise<QueryArtifact>;
  delete(id: string): Promise<boolean>;
  search(query: string, options?: { limit?: number }): Promise<QueryArtifact[]>;
}
