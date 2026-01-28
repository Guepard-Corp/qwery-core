import { useMutation, useQueryClient } from '@tanstack/react-query';

import { Notebook } from '@qwery/domain/entities';
import { INotebookRepository } from '@qwery/domain/repositories';
import {
  CreateNotebookService,
  DeleteNotebookService,
  UpdateNotebookService,
} from '@qwery/domain/services';
import {
  CreateNotebookInput,
  NotebookOutput,
  UpdateNotebookInput,
} from '@qwery/domain/usecases';
import {
  getNotebookKey,
  getNotebooksByProjectIdKey,
} from '../queries/use-get-notebook';

export function useCreateNotebook(
  notebookRepository: INotebookRepository,
  onSuccess?: (notebook: NotebookOutput) => void,
  onError?: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNotebookInput): Promise<NotebookOutput> => {
      const createNotebookService = new CreateNotebookService(
        notebookRepository,
      );
      return await createNotebookService.execute(input);
    },
    onSuccess: (notebookOutput) => {
      queryClient.invalidateQueries({
        queryKey: getNotebooksByProjectIdKey(notebookOutput.projectId),
      });
      onSuccess?.(notebookOutput);
    },
    onError,
  });
}

export function useNotebook(
  notebookRepository: INotebookRepository,
  onSuccess: (notebook: Notebook) => void,
  onError: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notebook: Notebook): Promise<NotebookOutput> => {
      const updateNotebookService = new UpdateNotebookService(
        notebookRepository,
      );

      const updateInput: UpdateNotebookInput = {
        id: notebook.id,
        projectId: notebook.projectId,
        title: notebook.title,
        description: notebook.description,
        cells: notebook.cells.map((cell) => ({
          query: cell.query,
          cellType: cell.cellType,
          cellId: cell.cellId,
          datasources: cell.datasources,
          isActive: cell.isActive,
          runMode: cell.runMode,
          title: cell.title,
        })),
        datasources: notebook.datasources,
      };

      return await updateNotebookService.execute(updateInput);
    },
    onSuccess: (notebookOutput: NotebookOutput) => {
      // Update the cache directly to avoid refetch that would reset user's typing
      queryClient.setQueryData(
        getNotebookKey(notebookOutput.slug),
        notebookOutput,
      );
      // Invalidate the list query to refresh metadata in lists
      queryClient.invalidateQueries({
        queryKey: getNotebooksByProjectIdKey(notebookOutput.projectId),
      });
      onSuccess(notebookOutput as unknown as Notebook);
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
  notebookRepository: INotebookRepository,
  onSuccess?: (input: DeleteNotebookInput) => void,
  onError?: (error: Error) => void,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteNotebookInput) => {
      const deleteNotebookService = new DeleteNotebookService(
        notebookRepository,
      );
      await deleteNotebookService.execute(input.id);
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
