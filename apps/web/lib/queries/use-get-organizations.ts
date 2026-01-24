import { useQuery } from '@tanstack/react-query';

import { IOrganizationRepository } from '@qwery/domain/repositories';
import {
  GetOrganizationService,
  GetOrganizationsService,
  GetOrganizationBySlugService,
} from '@qwery/domain/services';

export function getOrganizationsKey() {
  return ['organizations'];
}

export function useGetOrganizations(repository: IOrganizationRepository) {
  const useCase = new GetOrganizationsService(repository);
  return useQuery({
    queryKey: getOrganizationsKey(),
    queryFn: () => useCase.execute(),
    staleTime: 30 * 1000,
  });
}

export function useGetOrganization(
  repository: IOrganizationRepository,
  slug: string,
) {
  const useCase = new GetOrganizationBySlugService(repository);
  return useQuery({
    queryKey: ['organization', slug],
    queryFn: () => useCase.execute(slug),
    staleTime: 30 * 1000,
    enabled: !!slug,
  });
}

export function useGetOrganizationById(
  repository: IOrganizationRepository,
  id: string,
) {
  const useCase = new GetOrganizationService(repository);
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => useCase.execute(id),
    staleTime: 30 * 1000,
    enabled: !!id,
  });
}
