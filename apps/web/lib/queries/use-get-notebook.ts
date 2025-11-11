import { useQuery } from '@tanstack/react-query';

import { NotebookRepositoryPort } from '@qwery/domain/repositories';

export function getNotebookKey(key: string) {
  return ['notebook', key];
}

export function getNotebooksKey() {
  return ['notebooks'];
}

export function getNotebookByProjectIdKey(projectId: string) {
  return ['notebooks', 'project', projectId];
}

export function useGetNotebooks(repository: NotebookRepositoryPort) {
  return useQuery({
    queryKey: getNotebooksKey(),
    queryFn: () => repository.findAll(),
    staleTime: 30 * 1000,
  });
}

export function useGetNotebookByProjectId(
  repository: NotebookRepositoryPort,
  projectId: string,
) {
  return useQuery({
    queryKey: getNotebookKey(projectId),
    queryFn: () => repository.findByProjectId(projectId),
    staleTime: 30 * 1000,
  });
}

export function useGetNotebook(
  repository: NotebookRepositoryPort,
  slug: string,
) {
  return useQuery({
    queryKey: getNotebookKey(slug),
    queryFn: () => repository.findBySlug(slug),
    staleTime: 30 * 1000,
  });
}

export function useGetNotebookById(
  repository: NotebookRepositoryPort,
  id: string,
) {
  return useQuery({
    queryKey: getNotebookKey(id),
    queryFn: () => repository.findById(id),
    staleTime: 30 * 1000,
  });
}
