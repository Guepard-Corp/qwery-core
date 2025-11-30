import { useQuery } from '@tanstack/react-query';

import { IProjectRepository } from '@qwery/domain/repositories';
import {
  GetProjectBySlugService,
  GetProjectService,
  GetProjectsService,
} from '@qwery/domain/services';

export function useGetProjects(repository: IProjectRepository) {
  const useCase = new GetProjectsService(repository);
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => useCase.execute(),
    staleTime: 30 * 1000,
  });
}

export function useGetProjectById(repository: IProjectRepository, id: string) {
  const useCase = new GetProjectService(repository);
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => useCase.execute(id),
    staleTime: 30 * 1000,
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
