import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';

import type { ProjectOutput } from '@qwery/domain/usecases';
import { apiGet } from '../repositories/api-client';

export interface SearchProjectsResult {
  results: ProjectOutput[];
  total: number;
}

export interface SearchProjectsParams {
  query: string;
  orgId?: string;
  limit?: number;
  offset?: number;
}

export function getSearchProjectsKey(params: SearchProjectsParams) {
  return [
    'projects',
    'search',
    params.query,
    params.orgId,
    params.limit,
    params.offset,
  ];
}

export function useSearchProjects(
  params: SearchProjectsParams,
  options?: {
    enabled?: boolean;
    debounceMs?: number;
  },
) {
  const debouncedQuery = useDebounce(params.query, options?.debounceMs ?? 300);

  const searchParams = useMemo(
    () => ({
      ...params,
      query: debouncedQuery,
    }),
    [params, debouncedQuery],
  );

  return useQuery({
    queryKey: getSearchProjectsKey(searchParams),
    queryFn: async () => {
      const urlParams = new URLSearchParams();
      if (debouncedQuery) {
        urlParams.set('q', debouncedQuery);
      }
      if (params.orgId) {
        urlParams.set('orgId', params.orgId);
      }
      if (params.limit) {
        urlParams.set('limit', String(params.limit));
      }
      if (params.offset) {
        urlParams.set('offset', String(params.offset));
      }

      const result = await apiGet<SearchProjectsResult>(
        `/projects/search?${urlParams.toString()}`,
        false,
      );

      return result ?? { results: [], total: 0 };
    },
    enabled: (options?.enabled ?? true) && debouncedQuery.length > 0,
    staleTime: 10 * 1000,
  });
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
