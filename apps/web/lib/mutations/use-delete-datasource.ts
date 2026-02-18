import { useMutation, useQueryClient } from '@tanstack/react-query';

import { IDatasourceRepository } from '@qwery/domain/repositories';
import { DeleteDatasourceService } from '@qwery/domain/services';
import {
  getDatasourcesByProjectIdKey,
  getDatasourcesKey,
} from '~/lib/queries/use-get-datasources';

export function useDeleteDatasource(
  datasourceRepository: IDatasourceRepository,
  onSuccess: () => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      projectId,
    }: {
      id: string;
      projectId?: string;
    }) => {
      const deleteDatasourceService = new DeleteDatasourceService(
        datasourceRepository,
      );
      return await deleteDatasourceService.execute(id);
    },
    onSuccess: async (_result, { projectId }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: getDatasourcesKey() }),
        projectId
          ? queryClient.invalidateQueries({
              queryKey: getDatasourcesByProjectIdKey(projectId),
            })
          : Promise.resolve(),
      ]);
      onSuccess();
    },
    onError,
  });
}
