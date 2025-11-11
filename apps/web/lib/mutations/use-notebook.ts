import { useMutation } from '@tanstack/react-query';

import { Notebook } from '@qwery/domain/entities';
import { NotebookRepositoryPort } from '@qwery/domain/repositories';

export function useNotebook(
  notebookRepository: NotebookRepositoryPort,
  onSuccess: () => void,
  onError: (error: Error) => void,
) {
  return useMutation({
    mutationFn: async (notebook: Notebook) => {
      // Check if notebook exists by trying to find it
      try {
        await notebookRepository.findById(notebook.id);
        // If found, update it
        return await notebookRepository.update(notebook);
      } catch {
        // If not found, create it
        return await notebookRepository.create(notebook);
      }
    },
    onSuccess,
    onError,
  });
}
