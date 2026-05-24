import {
  createDatasource as buildDatasource,
  type CreateDatasourceInput,
  type Datasource,
  type IDatasourceRepository,
} from '@qwery/domain';

export interface CreateDatasourceDeps {
  datasourceRepo: IDatasourceRepository;
}

export async function createDatasource(
  deps: CreateDatasourceDeps,
  input: CreateDatasourceInput,
): Promise<Datasource> {
  const entity = buildDatasource(input);
  return deps.datasourceRepo.create(entity);
}
