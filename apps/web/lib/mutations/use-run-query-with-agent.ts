import { useMutation } from '@tanstack/react-query';

import type { DatasourceRepositoryPort } from '@qwery/domain/repositories';
import { useAgents } from '~/lib/hooks/use-agents';

type RunQueryWithAgentPayload = {
  cellId: number;
  query: string;
  datasourceId: string;
  datasourceRepository: DatasourceRepositoryPort;
};

export function useRunQueryWithAgent(
  onSuccess: (sqlQuery: string, cellId: number, datasourceId: string) => void,
  onError: (error: Error, cellId: number, sqlQuery: string) => void,
) {
  const { runQueryWithAgent } = useAgents();

  return useMutation({
    mutationFn: async (
      payload: RunQueryWithAgentPayload,
    ): Promise<{ sqlQuery: string; datasourceId: string }> => {
      const { query, datasourceId, datasourceRepository } = payload;

      const sqlQuery = await runQueryWithAgent(
        datasourceRepository,
        query,
        datasourceId,
      );

      if (!sqlQuery) {
        throw new Error('Agent did not generate a SQL query');
      }

      return { sqlQuery, datasourceId };
    },
    onSuccess: (result, variables) => {
      onSuccess(result.sqlQuery, variables.cellId, result.datasourceId);
    },
    onError: (error, variables) => {
      onError(
        error instanceof Error ? error : new Error('Unknown error'),
        variables.cellId,
        variables.query,
      );
    },
  });
}
