import { useQuery } from '@tanstack/react-query';

import { IProjectRepository } from '@qwery/domain/repositories';
import {
  GetProjectBySlugService,
  GetProjectService,
  GetProjectsByOrganizationIdService,
} from '@qwery/domain/services';

export function getProjectsByOrganizationIdKey(orgId: string) {
  return ['projects', orgId];
}

export function getProjectsByOrganizationIdQueryFn(
  repository: IProjectRepository,
  orgId: string,
) {
  const useCase = new GetProjectsByOrganizationIdService(repository);
  return () => useCase.execute(orgId);
}

export function useGetProjects(repository: IProjectRepository, orgId: string) {
  return useQuery({
    queryKey: getProjectsByOrganizationIdKey(orgId),
    queryFn: getProjectsByOrganizationIdQueryFn(repository, orgId),
    staleTime: 30 * 1000,
    enabled: !!orgId,
  });
}

export function useGetProjectById(
  repository: IProjectRepository,
  id: string,
  options?: { enabled?: boolean },
) {
  const useCase = new GetProjectService(repository);
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => useCase.execute(id),
    staleTime: 30 * 1000,
    enabled: options?.enabled !== undefined ? options.enabled && !!id : !!id,
  });
}

export function getProjectBySlugKey(slug: string) {
  return ['project', slug];
}

export function getProjectBySlugQueryFn(
  repository: IProjectRepository,
  slug: string,
) {
  const useCase = new GetProjectBySlugService(repository);
  return () => useCase.execute(slug);
}

export function useGetProjectBySlug(
  repository: IProjectRepository,
  slug: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: getProjectBySlugKey(slug),
    queryFn: getProjectBySlugQueryFn(repository, slug),
    staleTime: 30 * 1000,
    enabled:
      options?.enabled !== undefined ? options.enabled && !!slug : !!slug,
  });
}
