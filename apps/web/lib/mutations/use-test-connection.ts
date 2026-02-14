import { useMutation } from '@tanstack/react-query';
import { Datasource } from '@qwery/domain/entities';
import {
  DatasourceExtension,
  type DriverExtension,
} from '@qwery/extensions-sdk';
import { driverCommand } from '~/lib/repositories/api-client';
import { getBrowserDriverInstance } from '~/lib/services/browser-driver';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';

type TestConnectionResult = {
  success: boolean;
  error?: string;
  data: {
    connected: boolean;
    message: string;
  };
};

export function useTestConnection(
  onSuccess: (result: TestConnectionResult) => void,
  onError: (error: Error) => void,
) {
  const { data: extensions = [] } = useGetDatasourceExtensions();

  return useMutation({
    mutationFn: async (payload: Datasource) => {
      // Find the extension from the list
      const dsMeta = extensions.find(
        (ext) => ext.id === payload.datasource_provider,
      ) as DatasourceExtension | undefined;

      const driver =
        dsMeta?.drivers.find(
          (d) => d.id === (payload.config as { driverId?: string })?.driverId,
        ) ?? dsMeta?.drivers[0];

      const runtime = driver?.runtime ?? 'browser';

      if (runtime === 'browser') {
        const instance = await getBrowserDriverInstance(
          driver as DriverExtension,
          {
            config: payload.config,
          },
        );
        await instance.testConnection();
        return {
          success: true,
          data: {
            connected: true,
            message: 'Connection successful',
          },
        };
      }

      const data = await driverCommand<{
        connected: boolean;
        message: string;
      }>('testConnection', {
        datasourceProvider: payload.datasource_provider,
        driverId: driver?.id ?? '',
        config: payload.config,
      });

      return {
        success: true,
        data,
      };
    },
    onSuccess,
    onError,
  });
}
