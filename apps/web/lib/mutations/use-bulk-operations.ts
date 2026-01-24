import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OrganizationOutput, ProjectOutput } from '@qwery/domain/usecases';
import { apiPost } from '../repositories/api-client';
import { getOrganizationsKey } from '../queries/use-get-organizations';
import { getProjectsByOrganizationIdKey } from '../queries/use-get-projects';

export type BulkOperation = 'delete' | 'export' | 'copy';

export interface BulkOperationRequest {
  operation: BulkOperation;
  ids: string[];
  targetOrganizationId?: string; // For copy operation
}

export interface BulkOperationResponse<T> {
  success: boolean;
  deletedCount?: number;
  items?: T[];
}

export function useBulkOrganizations(
  options?: {
    onSuccess?: (response: BulkOperationResponse<OrganizationOutput>) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkOperationRequest) => {
      return await apiPost<BulkOperationResponse<OrganizationOutput>>(
        '/organizations/bulk',
        request,
      );
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({
        queryKey: getOrganizationsKey(),
      });
      options?.onSuccess?.(response);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useBulkProjects(
  options?: {
    onSuccess?: (response: BulkOperationResponse<ProjectOutput>) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkOperationRequest) => {
      return await apiPost<BulkOperationResponse<ProjectOutput>>(
        '/projects/bulk',
        request,
      );
    },
    onSuccess: (response, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      if (variables.targetOrganizationId) {
        queryClient.invalidateQueries({
          queryKey: getProjectsByOrganizationIdKey(
            variables.targetOrganizationId,
          ),
        });
      }
      options?.onSuccess?.(response);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

