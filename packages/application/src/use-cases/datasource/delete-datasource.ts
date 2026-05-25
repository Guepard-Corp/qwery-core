import type { IDatasourceRepository } from '@qwery/domain';

export interface DeleteDatasourceDeps {
  datasourceRepo: IDatasourceRepository;
}

export async function deleteDatasource(deps: DeleteDatasourceDeps, id: string): Promise<boolean> {
  return deps.datasourceRepo.delete(id);
}
