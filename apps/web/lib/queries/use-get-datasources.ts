import { useQuery } from '@tanstack/react-query';

import { IDatasourceRepository } from '@qwery/domain/repositories';
import {
  GetDatasourceBySlugService,
  GetDatasourceService,
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

export function getDatasourceByIdQueryFn(
  repository: IDatasourceRepository,
  id: string,
) {
  const useCase = new GetDatasourceService(repository);
  return () => useCase.execute(id);
}

export function useGetDatasourcesByProjectId(
  repository: IDatasourceRepository,
  projectId: string,
  options?: { enabled?: boolean },
) {
  const useCase = new GetDatasourcesByProjectIdService(repository);
  return useQuery({
    queryKey: getDatasourcesByProjectIdKey(projectId),
    queryFn: () => useCase.execute(projectId),
    staleTime: 30 * 1000,
    enabled:
      options?.enabled !== undefined
        ? options.enabled && !!projectId
        : !!projectId,
  });
}

export function useGetDatasourceBySlug(
  repository: IDatasourceRepository,
  slug: string,
  options?: { enabled?: boolean },
) {
  const useCase = new GetDatasourceBySlugService(repository);
  return useQuery({
    queryKey: getDatasourceKey(slug),
    queryFn: () => useCase.execute(slug),
    staleTime: 30 * 1000,
    enabled:
      options?.enabled !== undefined ? options.enabled && !!slug : !!slug,
  });
}
