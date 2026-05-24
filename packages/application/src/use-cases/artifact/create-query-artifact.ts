import {
  createQueryArtifact as buildQueryArtifact,
  type CreateQueryArtifactInput,
  type IArtifactRepository,
  type QueryArtifact,
} from '@qwery/domain';

export interface CreateQueryArtifactDeps {
  artifactRepo: IArtifactRepository;
}

export async function createQueryArtifact(
  deps: CreateQueryArtifactDeps,
  input: CreateQueryArtifactInput,
): Promise<QueryArtifact> {
  const entity = buildQueryArtifact(input);
  // The base repo accepts the union; persistence by-type happens inside.
  await deps.artifactRepo.create(entity);
  return entity;
}
