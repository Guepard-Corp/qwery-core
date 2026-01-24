import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Organization } from '@qwery/domain/entities';
import { IOrganizationRepository } from '@qwery/domain/repositories';
import {
  CreateOrganizationService,
  UpdateOrganizationService,
  DeleteOrganizationService,
} from '@qwery/domain/services';
import type {
  CreateOrganizationInput,
  UpdateOrganizationInput,
  OrganizationOutput,
} from '@qwery/domain/usecases';

import { getOrganizationsKey } from '../queries/use-get-organizations';

export function useCreateOrganization(
  repository: IOrganizationRepository,
  options?: {
    onSuccess?: (organization: Organization) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateOrganizationInput) => {
      const service = new CreateOrganizationService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: OrganizationOutput) => {
      queryClient.invalidateQueries({
        queryKey: getOrganizationsKey(),
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'search'],
      });
      options?.onSuccess?.(output as Organization);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useUpdateOrganization(
  repository: IOrganizationRepository,
  options?: {
    onSuccess?: (organization: Organization) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateOrganizationInput) => {
      const service = new UpdateOrganizationService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: OrganizationOutput) => {
      queryClient.invalidateQueries({
        queryKey: getOrganizationsKey(),
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', output.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['organization', output.slug],
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'search'],
      });
      // OrganizationOutput is structurally compatible with Organization
      // Both have the same fields (id, name, slug, userId, timestamps, etc.)
      options?.onSuccess?.(output as Organization);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useDeleteOrganization(
  repository: IOrganizationRepository,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (organizationId: string) => {
      const service = new DeleteOrganizationService(repository);
      return await service.execute(organizationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getOrganizationsKey(),
      });
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'search'],
      });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

