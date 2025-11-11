import { useQuery } from '@tanstack/react-query';

import { ProjectRepositoryPort } from '@qwery/domain/repositories';

export function useGetProjects(repository: ProjectRepositoryPort) {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => repository.findAll(),
    staleTime: 30 * 1000,
  });
}

export function useGetProjectById(
  repository: ProjectRepositoryPort,
  id: string,
) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => repository.findById(id),
    staleTime: 30 * 1000,
  });
}

export function useGetProjectBySlug(
  repository: ProjectRepositoryPort,
  slug: string,
) {
  return useQuery({
    queryKey: ['project', slug],
    queryFn: () => repository.findBySlug(slug),
    staleTime: 30 * 1000,
  });
}
