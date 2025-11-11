import { useQuery } from '@tanstack/react-query';

import { getExtension } from '@qwery/extensions-sdk';

export function useGetExtension(extensionId: string) {
  return useQuery({
    queryKey: ['extension', extensionId],
    queryFn: () => getExtension(extensionId),
    enabled: !!extensionId,
    staleTime: 60 * 1000,
  });
}
