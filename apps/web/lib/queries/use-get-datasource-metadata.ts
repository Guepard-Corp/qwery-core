import { useQuery } from '@tanstack/react-query';
import type { Datasource, DatasourceMetadata } from '@qwery/domain/entities';
import { DatasourceKind } from '@qwery/domain/entities';
import {
  DatasourceExtension,
  type DriverExtension,
} from '@qwery/extensions-sdk';
import { getBrowserDriverInstance } from '~/lib/services/browser-driver';
import { useGetDatasourceExtensions } from './use-get-extension';

export function getDatasourceMetadataKey(
  datasourceProvider: string,
  driverId: string,
  datasourceId?: string,
) {
  return ['datasource-metadata', datasourceProvider, driverId, datasourceId];
}

export function useGetDatasourceMetadata(
  datasource: Datasource | null | undefined,
  options?: { enabled?: boolean },
) {
  const { data: extensions = [] } = useGetDatasourceExtensions();

  return useQuery({
    queryKey: getDatasourceMetadataKey(
      datasource?.datasource_provider || '',
      datasource?.datasource_driver || '',
      datasource?.id,
    ),
    queryFn: async (): Promise<DatasourceMetadata> => {
      if (!datasource || !datasource.datasource_provider) {
        throw new Error('Datasource is required');
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

      // Handle browser drivers (embedded datasources) - client-side
      if (runtime === 'browser') {
        if (datasource.datasource_kind !== DatasourceKind.EMBEDDED) {
          throw new Error('Browser drivers require embedded datasources');
        }

        const driverInstance = await getBrowserDriverInstance(
          driver as DriverExtension,
          { config: datasource.config },
        );

        return await driverInstance.metadata();
      }

      // Handle node drivers (remote datasources) via API
      if (runtime === 'node') {
        const response = await fetch('/api/driver/command', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'metadata',
            datasourceProvider: datasource.datasource_provider,
            driverId: driver.id,
            config: datasource.config,
          }),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to get datasource metadata' }));
          throw new Error(error.error || 'Failed to get datasource metadata');
        }

        const result = await response.json();
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to get datasource metadata');
        }
        return result.data;
      }

      throw new Error(`Unsupported driver runtime: ${runtime}`);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled:
      options?.enabled !== undefined
        ? options.enabled && !!datasource && extensions.length > 0
        : !!datasource && extensions.length > 0,
  });
}
