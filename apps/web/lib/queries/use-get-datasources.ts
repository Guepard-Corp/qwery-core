import { useQuery } from '@tanstack/react-query';

import { IDatasourceRepository } from '@qwery/domain/repositories';
import {
  GetDatasourceBySlugService,
  GetDatasourcesByProjectIdService,
} from '@qwery/domain/services';

export function getDatasourcesKey() {
  return ['datasources'];
}

export function getDatasourcesByProjectIdKey(projectId: string) {
  return ['datasources', 'project', projectId];
}

export function getDatasourceKey(id: string) {
  return ['datasource', id];
}

export function useGetDatasourcesByProjectId(
  repository: IDatasourceRepository,
  projectId: string,
) {
  const useCase = new GetDatasourcesByProjectIdService(repository);
  return useQuery({
    queryKey: getDatasourcesByProjectIdKey(projectId),
    queryFn: () => useCase.execute(projectId),
    staleTime: 30 * 1000,
    enabled: !!projectId,
  });
}

export function useGetDatasourceBySlug(
  repository: IDatasourceRepository,
  slug: string,
) {
  const useCase = new GetDatasourceBySlugService(repository);
  return useQuery({
    queryKey: getDatasourceKey(slug),
    queryFn: () => useCase.execute(slug),
    staleTime: 30 * 1000,
    enabled: !!slug,
  });
}
