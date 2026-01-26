import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useEffect } from 'react';

import type { OrganizationOutput } from '@qwery/domain/usecases';
import { apiGet } from '../repositories/api-client';

export interface SearchOrganizationsResult {
  results: OrganizationOutput[];
  total: number;
}

export interface SearchOrganizationsParams {
  query: string;
  limit?: number;
  offset?: number;
}

export function getSearchOrganizationsKey(params: SearchOrganizationsParams) {
  return ['organizations', 'search', params.query, params.limit, params.offset];
}

export function useSearchOrganizations(
  params: SearchOrganizationsParams,
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
    queryKey: getSearchOrganizationsKey(searchParams),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (debouncedQuery) {
        searchParams.set('q', debouncedQuery);
      }
      if (params.limit) {
        searchParams.set('limit', String(params.limit));
      }
      if (params.offset) {
        searchParams.set('offset', String(params.offset));
      }

      const result = await apiGet<SearchOrganizationsResult>(
        `/organizations/search?${searchParams.toString()}`,
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
