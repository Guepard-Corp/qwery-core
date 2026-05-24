import {
  ArtifactType,
  updateQueryArtifact as applyUpdate,
  Code,
  Exception,
  type IArtifactRepository,
  type QueryArtifact,
  type UpdateQueryArtifactInput,
} from '@qwery/domain';

export interface UpdateQueryArtifactDeps {
  artifactRepo: IArtifactRepository;
}

export async function updateQueryArtifact(
  deps: UpdateQueryArtifactDeps,
  id: string,
  input: UpdateQueryArtifactInput,
): Promise<QueryArtifact> {
  const existing = await deps.artifactRepo.findById(id);
  if (!existing || existing.type !== ArtifactType.QUERY) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `QueryArtifact ${id} not found`,
    });
  }
  const updated = applyUpdate(existing, input);
  await deps.artifactRepo.update(updated);
  return updated;
}
