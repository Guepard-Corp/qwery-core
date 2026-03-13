import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import { CreateDatasourceService } from '@qwery/domain/services';
import {
  CreateDatasourceInput,
  DatasourceOutput,
} from '@qwery/domain/usecases';
import {
  getDatasourcesByProjectIdKey,
  getDatasourcesKey,
} from '~/lib/queries/use-get-datasources';
import { datasourceMetadataKeys } from '~/lib/queries/datasource-metadata-keys';

export function useCreateDatasource(
  datasourceRepository: IDatasourceRepository,
  onSuccess: (datasource: Datasource) => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasourceDTO: CreateDatasourceInput) => {
      const createDatasourceService = new CreateDatasourceService(
        datasourceRepository,
      );
      return await createDatasourceService.execute(datasourceDTO);
    },
    onSuccess: async (datasourceOutput: DatasourceOutput) => {
      await Promise.all([
        queryClient.refetchQueries({
          queryKey: getDatasourcesByProjectIdKey(datasourceOutput.projectId),
        }),
        queryClient.invalidateQueries({
          queryKey: getDatasourcesKey(),
        }),
        queryClient.removeQueries({
          predicate: ({ queryKey }) =>
            datasourceMetadataKeys.isDetailOf(queryKey, datasourceOutput.id),
        }),
      ]);
      onSuccess(datasourceOutput as unknown as Datasource);
    },
    onError,
  });
}
