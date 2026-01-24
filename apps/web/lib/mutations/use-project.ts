import { useMutation, useQueryClient } from '@tanstack/react-query';

import type { Project } from '@qwery/domain/entities';
import { IProjectRepository } from '@qwery/domain/repositories';
import {
  CreateProjectService,
  UpdateProjectService,
  DeleteProjectService,
} from '@qwery/domain/services';
import type {
  CreateProjectInput,
  UpdateProjectInput,
  ProjectOutput,
} from '@qwery/domain/usecases';

import {
  getProjectsByOrganizationIdKey,
} from '../queries/use-get-projects';

export function useCreateProject(
  repository: IProjectRepository,
  options?: {
    onSuccess?: (project: Project) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const service = new CreateProjectService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: ProjectOutput) => {
      queryClient.invalidateQueries({
        queryKey: getProjectsByOrganizationIdKey(output.organizationId),
      });
      options?.onSuccess?.(output as unknown as Project);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useUpdateProject(
  repository: IProjectRepository,
  options?: {
    onSuccess?: (project: Project) => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateProjectInput) => {
      const service = new UpdateProjectService(repository);
      return await service.execute(input);
    },
    onSuccess: (output: ProjectOutput) => {
      queryClient.invalidateQueries({
        queryKey: getProjectsByOrganizationIdKey(output.organizationId),
      });
      queryClient.invalidateQueries({
        queryKey: ['project', output.id],
      });
      queryClient.invalidateQueries({
        queryKey: ['project', output.slug],
      });
      options?.onSuccess?.(output as unknown as Project);
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

export function useDeleteProject(
  repository: IProjectRepository,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
  },
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: string) => {
      const service = new DeleteProjectService(repository);
      return await service.execute(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}

