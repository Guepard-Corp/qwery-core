import type { Artifact, ArtifactType, IArtifactRepository } from '@qwery/domain';

export interface SearchArtifactsDeps {
  artifactRepo: IArtifactRepository;
}

export interface SearchArtifactsInput {
  query: string;
  limit?: number;
  type?: ArtifactType;
}

/**
 * Keyword search over saved artifacts — title, description, tags, sql.
 * Used by the agent loop to inject top-N matching artifacts into the system
 * prompt for RAG reuse (ADR U11).
 */
export async function searchArtifacts(
  deps: SearchArtifactsDeps,
  input: SearchArtifactsInput,
): Promise<Artifact[]> {
  return deps.artifactRepo.search(input.query, { limit: input.limit, type: input.type });
}
