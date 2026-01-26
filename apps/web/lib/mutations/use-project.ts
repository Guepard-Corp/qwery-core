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

import { getProjectsByOrganizationIdKey } from '../queries/use-get-projects';

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
      queryClient.invalidateQueries({
        queryKey: ['projects', 'search'],
      });
      options?.onSuccess?.(output as Project);
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
      queryClient.invalidateQueries({
        queryKey: ['projects', 'search'],
      });
      // ProjectOutput is structurally compatible with Project
      // Both have the same fields (id, organizationId, name, slug, description, status, timestamps, etc.)
      options?.onSuccess?.(output as Project);
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
      // Fetch project before deletion to get organizationId for cache invalidation
      const project = await repository.findById(projectId);
      const service = new DeleteProjectService(repository);
      await service.execute(projectId);
      return project;
    },
    onSuccess: (project) => {
      // Invalidate organization-scoped project queries if we have the project
      if (project?.organizationId) {
        queryClient.invalidateQueries({
          queryKey: getProjectsByOrganizationIdKey(project.organizationId),
        });
      }
      // Broad invalidation as fallback
      queryClient.invalidateQueries({
        queryKey: ['projects'],
      });
      // Invalidate individual project queries
      if (project?.id) {
        queryClient.invalidateQueries({
          queryKey: ['project', project.id],
        });
      }
      if (project?.slug) {
        queryClient.invalidateQueries({
          queryKey: ['project', project.slug],
        });
      }
      // Invalidate search queries
      queryClient.invalidateQueries({
        queryKey: ['projects', 'search'],
      });
      options?.onSuccess?.();
    },
    onError: (error: Error) => {
      options?.onError?.(error);
    },
  });
}
