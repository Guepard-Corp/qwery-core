import { useMutation } from '@tanstack/react-query';
import {
  type Datasource,
  DatasourceKind,
  type DatasourceResultSet,
} from '@qwery/domain/entities';
import {
  DatasourceExtension,
  type DriverExtension,
} from '@qwery/extensions-sdk';
import { driverCommand } from '~/lib/repositories/api-client';
import { getBrowserDriverInstance } from '~/lib/services/browser-driver';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';

type RunQueryPayload = {
  cellId: number;
  query: string;
  datasourceId: string;
  datasource: Datasource;
  conversationId?: string; // Optional: for DuckDB execution (Google Sheets)
};

export function useRunQuery(
  onSuccess: (result: DatasourceResultSet, cellId: number) => void,
  onError: (error: Error, cellId: number) => void,
) {
  const { data: extensions = [] } = useGetDatasourceExtensions();

  return useMutation({
    mutationFn: async (
      payload: RunQueryPayload,
    ): Promise<DatasourceResultSet> => {
      const { query, datasource } = payload;

      if (!query.trim()) {
        throw new Error('Query cannot be empty');
      }

      if (!datasource.datasource_provider) {
        throw new Error(
          `Datasource ${datasource.id} is missing datasource_provider`,
        );
      }

      // Get driver metadata to check runtime
      const dsMeta = extensions.find(
        (ext) => ext.id === datasource.datasource_provider,
      ) as DatasourceExtension | undefined;

      if (!dsMeta) {
        throw new Error('Datasource metadata not found');
      }

      const driver =
        dsMeta.drivers.find(
          (d) =>
            d.id === (datasource.config as { driverId?: string })?.driverId,
        ) ?? dsMeta.drivers[0];

      if (!driver) {
        throw new Error('Driver not found');
      }

      const runtime = driver.runtime ?? 'browser';

      // Handle browser drivers (embedded datasources)
      if (runtime === 'browser') {
        if (datasource.datasource_kind !== DatasourceKind.EMBEDDED) {
          throw new Error('Browser drivers require embedded datasources');
        }

        const driverInstance = await getBrowserDriverInstance(
          driver as DriverExtension,
          { config: datasource.config },
        );

        const result = await driverInstance.query(query);
        return result;
      }

      // Handle node drivers (remote datasources) via API
      if (runtime === 'node') {
        return driverCommand<DatasourceResultSet>('query', {
          datasourceProvider: datasource.datasource_provider,
          driverId: driver.id,
          config: datasource.config,
          sql: query,
        });
      }

      throw new Error(`Unsupported driver runtime: ${runtime}`);
    },
    onSuccess: (result, variables) => {
      onSuccess(result, variables.cellId);
    },
    onError: (error, variables) => {
      onError(
        error instanceof Error ? error : new Error('Unknown error'),
        variables.cellId,
      );
    },
  });
}
