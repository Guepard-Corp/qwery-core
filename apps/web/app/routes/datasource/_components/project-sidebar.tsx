import { useCallback, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { toast } from 'sonner';

import { NewDatasource } from '@qwery/datasources/new-datasource';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from '@qwery/ui/shadcn-sidebar';
import { SidebarNavigation } from '@qwery/ui/sidebar-navigation';

import { AccountDropdownContainer } from '~/components/account-dropdown-container';
import pathsConfig from '~/config/paths.config';
import { createNavigationConfig } from '~/config/project.navigation.config';
import { createPath } from '~/config/qwery.navigation.config';
import { Shortcuts } from 'node_modules/@qwery/ui/src/qwery/shortcuts';
import { useTelemetry, PROJECT_EVENTS } from '@qwery/telemetry';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetNotebooksByProjectId } from '~/lib/queries/use-get-notebook';
import { useDeleteNotebook } from '~/lib/mutations/use-notebook';
import type { NotebookOutput } from '@qwery/domain/usecases';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
import { Loader2, Plus } from 'lucide-react';

export function ProjectSidebar() {
  const navigate = useNavigate();
  const { workspace, repositories } = useWorkspace();
  const telemetry = useTelemetry();
  const params = useParams();
  const slug = params.slug as string;

  const notebookRepository = repositories.notebook;
  const notebooks = useGetNotebooksByProjectId(
    notebookRepository,
    workspace.projectId,
  );
  const notebooksList = useMemo(() => notebooks?.data ?? [], [notebooks?.data]);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isCreatingNotebook, setIsCreatingNotebook] = useState(false);

  const deleteNotebookMutation = useDeleteNotebook(
    notebookRepository,
    undefined,
    (error) => {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete notebook: ${message}`);
    },
  );

  const _handleDeleteNotebook = useCallback(
    async (notebook: NotebookOutput) => {
      if (!workspace.projectId) {
        toast.error('Unable to resolve project context for deletion');
        return;
      }

      try {
        await deleteNotebookMutation.mutateAsync({
          id: notebook.id,
          slug: notebook.slug,
          projectId: workspace.projectId,
        });
        toast.success('Notebook deleted');
      } catch {
        // errors handled in mutation onError
      }
    },
    [deleteNotebookMutation, workspace.projectId],
  );

  const handleConfirmDeleteAll = useCallback(async () => {
    if (!workspace.projectId || notebooksList.length === 0) {
      setShowDeleteAllDialog(false);
      return;
    }

    setIsBulkDeleting(true);
    try {
      for (const notebook of notebooksList) {
        await deleteNotebookMutation.mutateAsync({
          id: notebook.id,
          slug: notebook.slug,
          projectId: workspace.projectId,
        });
      }
      toast.success('All notebooks deleted');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete notebooks: ${message}`);
    } finally {
      setIsBulkDeleting(false);
      setShowDeleteAllDialog(false);
    }
  }, [deleteNotebookMutation, notebooksList, workspace.projectId]);

  const generateNotebookTitle = useCallback(() => {
    const base = 'Untitled notebook';
    const existingTitles = new Set(
      notebooksList.map((notebook) => notebook.title.trim()),
    );
    if (!existingTitles.has(base)) {
      return base;
    }
    let counter = 2;
    while (true) {
      const candidate = `${base} ${counter}`;
      if (!existingTitles.has(candidate)) {
        return candidate;
      }
      counter += 1;
    }
  }, [notebooksList]);

  const handleCreateNotebook = useCallback(async () => {
    if (!workspace.projectId) {
      toast.error('Unable to resolve project context for notebook creation');
      return;
    }

    setIsCreatingNotebook(true);
    try {
      const response = await fetch('/api/notebooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: workspace.projectId,
          title: generateNotebookTitle(),
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const message = errorBody?.error || 'Failed to create notebook';
        throw new Error(message);
      }

      const notebook = await response.json();
      await notebooks.refetch();
      navigate(createPath(pathsConfig.app.projectNotebook, notebook.slug));
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error ? error.message : 'Failed to create notebook';
      toast.error(message);
    } finally {
      setIsCreatingNotebook(false);
    }
  }, [generateNotebookTitle, navigate, notebooks, workspace.projectId]);

  const _notebookGroupAction = workspace.projectId ? (
    <span
      className="flex h-full w-full items-center justify-center"
      onClick={(event) => {
        event.stopPropagation();
        if (!isCreatingNotebook && !isBulkDeleting) {
          handleCreateNotebook();
        }
      }}
      aria-label="Add new notebook"
    >
      {isCreatingNotebook ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
      ) : (
        <Plus className="h-4 w-4 shrink-0" />
      )}
    </span>
  ) : undefined;

  const navigationConfig = createNavigationConfig(slug);
  return (
    <>
      <Sidebar collapsible="none">
        <SidebarHeader className={'h-16 justify-center'}>
          <div className="flex w-full items-center justify-center">
            <NewDatasource
              showLabel
              onClick={() => {
                telemetry.trackEvent(PROJECT_EVENTS.NEW_DATASOURCE_CLICKED);
                navigate(createPath(pathsConfig.app.availableSources, slug));
              }}
            />
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarNavigation config={navigationConfig} />
        </SidebarContent>

        <SidebarFooter>
          <div className="flex flex-col space-y-2 p-4">
            <div
              onClick={() => {
                const isMac =
                  navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                const event = new KeyboardEvent('keydown', {
                  key: 'l',
                  code: 'KeyL',
                  [isMac ? 'metaKey' : 'ctrlKey']: true,
                  bubbles: true,
                  cancelable: true,
                });
                window.dispatchEvent(event);
              }}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  const isMac =
                    navigator.platform.toUpperCase().indexOf('MAC') >= 0;
                  const keyboardEvent = new KeyboardEvent('keydown', {
                    key: 'l',
                    code: 'KeyL',
                    [isMac ? 'metaKey' : 'ctrlKey']: true,
                    bubbles: true,
                    cancelable: true,
                  });
                  window.dispatchEvent(keyboardEvent);
                }
              }}
            >
              <Shortcuts
                items={[
                  {
                    text: 'Agent',
                    keys: ['⌘', 'L'],
                  },
                ]}
              />
            </div>
          </div>
          <AccountDropdownContainer />
        </SidebarFooter>
      </Sidebar>

      <AlertDialog
        open={showDeleteAllDialog}
        onOpenChange={(open: boolean) => {
          if (!isBulkDeleting) {
            setShowDeleteAllDialog(open);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete all notebooks?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove every notebook in this project. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBulkDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDeleteAll}
              disabled={isBulkDeleting}
            >
              {isBulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete all'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
