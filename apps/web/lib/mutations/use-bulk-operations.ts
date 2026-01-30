import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { OrganizationOutput, ProjectOutput } from '@qwery/domain/usecases';
import { apiPost } from '../repositories/api-client';
import { getOrganizationsKey } from '../queries/use-get-organizations';

export type BulkOperation = 'delete' | 'export';

export interface BulkOperationRequest {
  operation: BulkOperation;
  ids: string[];
}

export interface BulkOperationResponse<T> {
  success: boolean;
  deletedCount?: number;
  failedIds?: string[];
  items?: T[];
}

export function useBulkOrganizations(options?: {
  onSuccess?: (response: BulkOperationResponse<OrganizationOutput>) => void;
  onError?: (error: Error) => void;
}) {
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
      queryClient.invalidateQueries({
        queryKey: ['organizations', 'search'],
      });
      options?.onSuccess?.(response);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useBulkProjects(options?: {
  onSuccess?: (response: BulkOperationResponse<ProjectOutput>) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BulkOperationRequest) => {
      return await apiPost<BulkOperationResponse<ProjectOutput>>(
        '/projects/bulk',
        request,
      );
    },
    onSuccess: (response) => {
      // Always invalidate all project queries after bulk operations
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Also invalidate search queries
      queryClient.invalidateQueries({
        queryKey: ['projects', 'search'],
      });
      options?.onSuccess?.(response);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
