import {
  type Artifact,
  ArtifactType,
  type IArtifactRepository,
  type QueryArtifact,
  type RepositoryFindOptions,
} from '@qwery/domain';

export interface ArtifactRepoDeps {
  artifactRepo: IArtifactRepository;
}

export async function getArtifact(deps: ArtifactRepoDeps, id: string): Promise<Artifact | null> {
  return deps.artifactRepo.findById(id);
}

export async function listArtifacts(
  deps: ArtifactRepoDeps,
  options?: RepositoryFindOptions,
): Promise<Artifact[]> {
  return deps.artifactRepo.findAll(options);
}

export async function listArtifactsByDatasource(
  deps: ArtifactRepoDeps,
  datasourceId: string,
): Promise<Artifact[]> {
  return deps.artifactRepo.findByDatasourceId(datasourceId);
}

export async function listArtifactsByTag(deps: ArtifactRepoDeps, tag: string): Promise<Artifact[]> {
  return deps.artifactRepo.findByTag(tag);
}

export async function listQueryArtifacts(deps: ArtifactRepoDeps): Promise<QueryArtifact[]> {
  return deps.artifactRepo.findByType(ArtifactType.QUERY);
}
