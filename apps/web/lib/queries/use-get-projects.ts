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

export function useGetProjects(repository: IProjectRepository, orgId: string) {
  const useCase = new GetProjectsByOrganizationIdService(repository);
  return useQuery({
    queryKey: getProjectsByOrganizationIdKey(orgId),
    queryFn: () => useCase.execute(orgId),
    staleTime: 30 * 1000,
    enabled: !!orgId,
  });
}

export function useGetProjectById(repository: IProjectRepository, id: string) {
  const useCase = new GetProjectService(repository);
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => useCase.execute(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}

export function useGetProjectBySlug(
  repository: IProjectRepository,
  slug: string,
) {
  const useCase = new GetProjectBySlugService(repository);
  return useQuery({
    queryKey: ['project', slug],
    queryFn: () => useCase.execute(slug),
    staleTime: 30 * 1000,
  });
}
