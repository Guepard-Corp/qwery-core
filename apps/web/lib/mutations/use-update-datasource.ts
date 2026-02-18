import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import { UpdateDatasourceService } from '@qwery/domain/services';
import {
  UpdateDatasourceInput,
  DatasourceOutput,
} from '@qwery/domain/usecases';
import {
  getDatasourcesByProjectIdKey,
  getDatasourcesKey,
} from '~/lib/queries/use-get-datasources';

export function useUpdateDatasource(
  datasourceRepository: IDatasourceRepository,
  onSuccess: (datasource: Datasource) => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasourceDTO: UpdateDatasourceInput) => {
      const updateDatasourceService = new UpdateDatasourceService(
        datasourceRepository,
      );
      return await updateDatasourceService.execute(datasourceDTO);
    },
    onSuccess: async (datasourceOutput: DatasourceOutput) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDatasourcesKey() }),
        datasourceOutput.projectId
          ? queryClient.invalidateQueries({
              queryKey: getDatasourcesByProjectIdKey(
                datasourceOutput.projectId,
              ),
            })
          : Promise.resolve(),
      ]);
      onSuccess(datasourceOutput as unknown as Datasource);
    },
    onError,
  });
}
