import { useQuery } from '@tanstack/react-query';

import { OrganizationRepositoryPort } from '@qwery/domain/repositories';

export function useGetOrganizations(repository: OrganizationRepositoryPort) {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: () => repository.findAll(),
    staleTime: 30 * 1000,
  });
}

export function useGetOrganization(
  repository: OrganizationRepositoryPort,
  slug: string,
) {
  return useQuery({
    queryKey: ['organization', slug],
    queryFn: () => repository.findBySlug(slug),
    staleTime: 30 * 1000,
  });
}

export function useGetOrganizationById(
  repository: OrganizationRepositoryPort,
  id: string,
) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => repository.findById(id),
    staleTime: 30 * 1000,
  });
}
