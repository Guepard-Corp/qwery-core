import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Datasource } from '@qwery/domain/entities';
import { IDatasourceRepository } from '@qwery/domain/repositories';
import { PlaygroundBuilder } from '@qwery/playground/playgrounds';

import { getDatasourcesKey } from '../queries/use-get-datasources';

export function usePlayground(
  repository: IDatasourceRepository,
  onSuccess: () => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      playgroundId,
      projectId,
    }: {
      playgroundId: string;
      projectId: string;
    }): Promise<Datasource> => {
      const playgroundBuilder = new PlaygroundBuilder(repository);
      return await playgroundBuilder.build(playgroundId, projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: getDatasourcesKey() });
      onSuccess();
    },
    onError,
  });
}
