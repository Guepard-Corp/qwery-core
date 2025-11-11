import { useQuery } from '@tanstack/react-query';

import { DatasourceRepositoryPort } from '@qwery/domain/repositories';

export function getDatasourcesKey() {
  return ['datasources'];
}

export function getDatasourceKey(id: string) {
  return ['datasource', id];
}

export function useGetDatasources(repository: DatasourceRepositoryPort) {
  return useQuery({
    queryKey: getDatasourcesKey(),
    queryFn: () => repository.findAll(),
    staleTime: 30 * 1000,
  });
}

export function useGetDatasourceBySlug(
  repository: DatasourceRepositoryPort,
  slug: string,
) {
  return useQuery({
    queryKey: getDatasourceKey(slug),
    queryFn: () => repository.findBySlug(slug),
    staleTime: 30 * 1000,
  });
}
