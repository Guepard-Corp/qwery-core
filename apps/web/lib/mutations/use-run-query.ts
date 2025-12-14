import { useMutation } from '@tanstack/react-query';

import {
  type Datasource,
  DatasourceKind,
  type DatasourceResultSet,
} from '@qwery/domain/entities';
import { getExtension, getDiscoveredDatasource } from '@qwery/extensions-sdk';

type RunQueryPayload = {
  cellId: number;
  query: string;
  datasourceId: string;
  datasource: Datasource;
};

export function useRunQuery(
  onSuccess: (result: DatasourceResultSet, cellId: number) => void,
  onError: (error: Error, cellId: number) => void,
) {
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
      const dsMeta = await getDiscoveredDatasource(
        datasource.datasource_provider,
      );
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

        const extension = await getExtension(datasource.datasource_provider);
        if (!extension) {
          throw new Error('Extension not found');
        }

        const driverStorageKey =
          (datasource.config as { storageKey?: string })?.storageKey ??
          datasource.id ??
          datasource.slug ??
          datasource.name;
        const driverInstance = await extension.getDriver(
          driverStorageKey,
          datasource.config,
        );
        if (!driverInstance) {
          throw new Error('Driver not found');
        }

        const result = await driverInstance.query(query, datasource.config);
        return {
          rows: result.rows,
          columns: result.columns,
          stat: result.stat ?? {
            rowsAffected: 0,
            rowsRead: result.rows.length,
            rowsWritten: 0,
            queryDurationMs: null,
          },
        };
      }

      // Handle node drivers (remote datasources) via API
      if (runtime === 'node') {
        const response = await fetch('/api/driver/command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'query',
            datasourceProvider: datasource.datasource_provider,
            driverId: driver.id,
            config: datasource.config,
            sql: query,
          }),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to execute query' }));
          throw new Error(error.error || 'Failed to execute query');
        }

        const apiResult = await response.json();
        if (!apiResult.success || !apiResult.data) {
          throw new Error(
            apiResult.error || 'Query execution failed on server',
          );
        }

        const result = apiResult.data;
        return {
          rows: result.rows,
          columns: result.columns,
          stat: result.stat ?? {
            rowsAffected: 0,
            rowsRead: result.rows.length,
            rowsWritten: 0,
            queryDurationMs: null,
          },
        };
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
