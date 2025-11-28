import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Notebook } from '@qwery/domain/entities';
import { NotebookRepositoryPort } from '@qwery/domain/repositories';
import {
  getNotebookKey,
  getNotebooksByProjectIdKey,
} from '../queries/use-get-notebook';

export function useNotebook(
  notebookRepository: NotebookRepositoryPort,
  onSuccess: (notebook: Notebook) => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notebook: Notebook) => {
      try {
        return await notebookRepository.update(notebook);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.toLowerCase().includes('not found')
        ) {
          return await notebookRepository.create(notebook);
        }
        throw error;
      }
    },
    onSuccess: (notebook: Notebook) => {
      queryClient.invalidateQueries({
        queryKey: getNotebookKey(notebook.slug),
      });
      queryClient.invalidateQueries({
        queryKey: getNotebooksByProjectIdKey(notebook.projectId),
      });
      onSuccess(notebook);
    },
    onError,
  });
}

type DeleteNotebookInput = {
  id: string;
  slug: string;
  projectId: string;
};

export function useDeleteNotebook(
  notebookRepository: NotebookRepositoryPort,
  onSuccess?: (input: DeleteNotebookInput) => void,
  onError?: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteNotebookInput) => {
      await notebookRepository.delete(input.id);
      return input;
    },
    onSuccess: (input) => {
      queryClient.invalidateQueries({
        queryKey: getNotebookKey(input.slug),
      });
      queryClient.invalidateQueries({
        queryKey: getNotebooksByProjectIdKey(input.projectId),
      });
      onSuccess?.(input);
    },
    onError,
  });
}
