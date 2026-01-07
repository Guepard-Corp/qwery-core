import { useQuery } from '@tanstack/react-query';

import { INotebookRepository } from '@qwery/domain/repositories';
import {
  GetNotebookBySlugService,
  GetNotebooksByProjectIdService,
  GetNotebookService,
} from '@qwery/domain/services';

export function getNotebookKey(key: string) {
  return ['notebook', key];
}

export function getNotebooksKey() {
  return ['notebooks'];
}

export function getNotebooksByProjectIdKey(projectId: string) {
  return ['notebooks', 'project', projectId];
}

export function useGetNotebooksByProjectId(
  repository: INotebookRepository,
  projectId: string | undefined,
  options?: { enabled?: boolean },
) {
  const useCase = new GetNotebooksByProjectIdService(repository);
  return useQuery({
    queryKey: getNotebooksByProjectIdKey(projectId || ''),
    queryFn: () => useCase.execute(projectId || ''),
    staleTime: 30 * 1000,
    enabled:
      options?.enabled !== undefined
        ? options.enabled && !!projectId
        : !!projectId,
  });
}

export function useGetNotebook(
  repository: INotebookRepository,
  slug: string,
  options?: { enabled?: boolean },
) {
  const useCase = new GetNotebookBySlugService(repository);
  return useQuery({
    queryKey: getNotebookKey(slug),
    queryFn: () => useCase.execute(slug),
    staleTime: 30 * 1000,
    enabled:
      options?.enabled !== undefined ? options.enabled && !!slug : !!slug,
  });
}

export function useGetNotebookById(
  repository: INotebookRepository,
  id: string,
  options?: { enabled?: boolean },
) {
  const useCase = new GetNotebookService(repository);
  return useQuery({
    queryKey: getNotebookKey(id),
    queryFn: () => useCase.execute(id),
    staleTime: 30 * 1000,
    enabled: options?.enabled !== undefined ? options.enabled && !!id : !!id,
  });
}
