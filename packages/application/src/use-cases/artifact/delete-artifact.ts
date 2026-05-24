import type { IArtifactRepository } from '@qwery/domain';

export interface DeleteArtifactDeps {
  artifactRepo: IArtifactRepository;
}

export async function deleteArtifact(deps: DeleteArtifactDeps, id: string): Promise<boolean> {
  return deps.artifactRepo.delete(id);
}
