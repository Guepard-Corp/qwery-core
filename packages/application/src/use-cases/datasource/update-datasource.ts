import {
  updateDatasource as applyUpdate,
  Code,
  type Datasource,
  Exception,
  type IDatasourceRepository,
  type UpdateDatasourceInput,
} from '@qwery/domain';

export interface UpdateDatasourceDeps {
  datasourceRepo: IDatasourceRepository;
}

export async function updateDatasource(
  deps: UpdateDatasourceDeps,
  id: string,
  input: UpdateDatasourceInput,
): Promise<Datasource> {
  const existing = await deps.datasourceRepo.findById(id);
  if (!existing) {
    throw Exception.new({
      code: Code.ENTITY_NOT_FOUND_ERROR,
      overrideMessage: `Datasource ${id} not found`,
    });
  }
  const updated = applyUpdate(existing, input);
  return deps.datasourceRepo.update(updated);
}
