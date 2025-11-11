import { useMutation } from '@tanstack/react-query';

import { DatasourceKind } from '@qwery/domain/entities';
import { Datasource } from '@qwery/domain/entities';
import { getExtension } from '@qwery/extensions-sdk';

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
  return useMutation({
    mutationFn: async (payload: Datasource) => {
      if (payload.datasource_kind === DatasourceKind.EMBEDDED) {
        const extension = await getExtension(payload.datasource_provider);
        if (!extension) {
          throw new Error('Extension not found');
        }
        const driver = await extension.getDriver(payload.name, payload.config);
        if (!driver) {
          throw new Error('Driver not found');
        }
        const result = await driver.testConnection();
        if (!result) {
          throw new Error('Failed to test connection');
        }
        return {
          success: true,
          data: {
            connected: result,
            message: 'Connection successful',
          },
        };
      } else {
        const response = await fetch('/api/test-connection', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response
            .json()
            .catch(() => ({ error: 'Failed to test connection' }));
          throw new Error(error.error || 'Failed to test connection');
        }

        return response.json();
      }
    },
    onSuccess,
    onError,
  });
}
