import type { Datasource, IDatasourceRepository, RepositoryFindOptions } from '@qwery/domain';

export interface DatasourceRepoDeps {
  datasourceRepo: IDatasourceRepository;
}

export async function getDatasource(deps: DatasourceRepoDeps, id: string): Promise<Datasource | null> {
  return deps.datasourceRepo.findById(id);
}

export async function getDatasourceBySlug(
  deps: DatasourceRepoDeps,
  slug: string,
): Promise<Datasource | null> {
  return deps.datasourceRepo.findBySlug(slug);
}

export async function listDatasources(
  deps: DatasourceRepoDeps,
  options?: RepositoryFindOptions,
): Promise<Datasource[]> {
  return deps.datasourceRepo.findAll(options);
}
