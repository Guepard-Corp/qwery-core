import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getUsageKey } from '~/lib/queries/use-get-usage';

export function useInvalidateUsage() {
  const queryClient = useQueryClient();

  return useCallback(
    (conversationSlug: string, userId?: string) => {
      queryClient.invalidateQueries({
        queryKey: getUsageKey(conversationSlug, userId),
      });
    },
    [queryClient],
  );
}
