import { useEffect } from 'react';

import { useTelemetry } from './use-telemetry';

export function useCaptureException(
  error: Error,
  params: {
    reportError?: boolean;
  } = {
    reportError: true,
  },
) {
  const service = useTelemetry();

  useEffect(() => {
    if (!params.reportError) {
      return;
    }

    service.trackError(error);
  }, [error, service, params]);
}
