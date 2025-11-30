import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Navigate, useNavigate, useParams } from 'react-router';

import { toast } from 'sonner';

import {
  type DatasourceResultSet,
  type Notebook,
} from '@qwery/domain/entities';
import { NotebookCellData, NotebookUI } from '@qwery/notebook';

import pathsConfig, { createPath } from '~/config/paths.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useGetProjectById } from '~/lib/queries/use-get-projects';
import { useDeleteNotebook, useNotebook } from '~/lib/mutations/use-notebook';
import { useRunQuery } from '~/lib/mutations/use-run-query';
import { useRunQueryWithAgent } from '~/lib/mutations/use-run-query-with-agent';
import { useGetDatasourcesByProjectId } from '~/lib/queries/use-get-datasources';
import { useGetNotebook } from '~/lib/queries/use-get-notebook';
import { NOTEBOOK_EVENTS, telemetry } from '@qwery/telemetry';
import { Skeleton } from '@qwery/ui/skeleton';
import { getAllExtensionMetadata } from '@qwery/extensions-sdk';

export default function NotebookPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { repositories, workspace } = useWorkspace();
  const navigate = useNavigate();
  const notebookRepository = repositories.notebook;
  const datasourceRepository = repositories.datasource;
  const project = useGetProjectById(
    repositories.project,
    workspace.projectId || '',
  );

  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Store query results by cell ID
  const [cellResults, setCellResults] = useState<
    Map<number, DatasourceResultSet>
  >(new Map());

  // Store query errors by cell ID
  const [cellErrors, setCellErrors] = useState<Map<number, string>>(new Map());

  // Track which cell is currently loading
  const [loadingCellId, setLoadingCellId] = useState<number | null>(null);

  // Load notebook
  const notebook = useGetNotebook(notebookRepository, slug);

  // Load datasources
  const savedDatasources = useGetDatasourcesByProjectId(
    datasourceRepository,
    workspace.projectId as string,
  );

  const { data: pluginMetadata = [] } = useQuery({
    queryKey: ['all-plugin-metadata'],
    queryFn: () => getAllExtensionMetadata(),
    staleTime: 60 * 1000,
  });

  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    pluginMetadata.forEach((plugin) => {
      if (plugin?.id && plugin.logo) {
        map.set(plugin.id, plugin.logo);
      }
    });
    return map;
  }, [pluginMetadata]);

  // Save notebook mutation
  const saveNotebookMutation = useNotebook(
    notebookRepository,
    () => {},
    (error) => {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to save notebook: ${message}`);
    },
  );

  const deleteNotebookMutation = useDeleteNotebook(
    notebookRepository,
    (deletedNotebook) => {
      toast.success('Notebook deleted');
      const projectSlug = project.data?.slug;
      if (projectSlug && deletedNotebook?.slug === normalizedNotebook?.slug) {
        navigate(createPath(pathsConfig.app.project, projectSlug));
      }
    },
    (error) => {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to delete notebook: ${message}`);
    },
  );

  // Run query mutation
  const runQueryMutation = useRunQuery(
    (result, cellId) => {
      setCellResults((prev) => {
        const next = new Map(prev);
        next.set(cellId, result);
        return next;
      });
      // Clear error on success
      setCellErrors((prev) => {
        const next = new Map(prev);
        next.delete(cellId);
        return next;
      });
      setLoadingCellId(null);
    },
    (error, cellId) => {
      setCellErrors((prev) => {
        const next = new Map(prev);
        next.set(cellId, error.message);
        return next;
      });
      // Clear result on error
      setCellResults((prev) => {
        const next = new Map(prev);
        next.delete(cellId);
        return next;
      });
      setLoadingCellId(null);
      toast.error(error.message);
    },
  );

  const handleRunQuery = (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => {
    console.log('handleRunQuery', cellId, query, datasourceId);
    const datasource = savedDatasources.data?.find(
      (ds) => ds.id === datasourceId,
    );
    if (!datasource) {
      toast.error('Datasource not found');
      return;
    }

    setLoadingCellId(cellId);
    telemetry.trackEvent(NOTEBOOK_EVENTS.NOTEBOOK_RUN_QUERY, {
      query,
      datasourceName: datasource.name,
    });
    runQueryMutation.mutate({
      cellId,
      query,
      datasourceId,
      datasource,
    });
  };

  // Run query with agent mutation
  const runQueryWithAgentMutation = useRunQueryWithAgent(
    (sqlQuery, cellId, datasourceId) => {
      // Agent generated SQL successfully, now run it
      handleRunQuery(cellId, sqlQuery, datasourceId);
    },
    (error, cellId, query) => {
      setCellErrors((prev) => {
        const next = new Map(prev);
        next.set(
          cellId,
          `${error.message} 
          sqlQuery: ${query}`,
        );
        return next;
      });
      // Clear result on error
      setCellResults((prev) => {
        const next = new Map(prev);
        next.delete(cellId);
        return next;
      });
      setLoadingCellId(null);
    },
  );

  const handleRunQueryWithAgent = (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => {
    setLoadingCellId(cellId);
    telemetry.trackEvent(NOTEBOOK_EVENTS.NOTEBOOK_RUN_QUERY, {
      query,
      datasourceName: datasourceId,
    });
    runQueryWithAgentMutation.mutate({
      cellId,
      query,
      datasourceId,
      datasourceRepository,
    });
  };

  const normalizedNotebook: Notebook | undefined = (() => {
    if (!notebook.data) {
      return undefined;
    }

    const createdAt =
      notebook.data.createdAt instanceof Date
        ? notebook.data.createdAt
        : new Date(notebook.data.createdAt);
    const updatedAt =
      notebook.data.updatedAt instanceof Date
        ? notebook.data.updatedAt
        : new Date(notebook.data.updatedAt);

    return {
      ...notebook.data,
      createdAt,
      updatedAt,
      cells: notebook.data.cells.map((cell) => ({
        ...cell,
        datasources: cell.datasources || [],
        cellType: cell.cellType || 'text',
        cellId: cell.cellId || 0,
        isActive: cell.isActive ?? true,
        runMode: cell.runMode || 'default',
      })),
    } as Notebook;
  })();

  // Track current unsaved state
  const currentNotebookStateRef = useRef<{
    cells: NotebookCellData[];
    title: string;
  } | null>(null);

  // Save notebook manually
  const persistNotebook = useCallback(
    (payload: Notebook) => {
      saveNotebookMutation.mutate(payload);
    },
    [saveNotebookMutation],
  );

  const handleSave = useCallback(() => {
    if (!normalizedNotebook || !currentNotebookStateRef.current) {
      return;
    }

    const now = new Date();
    const notebookDatasources =
      normalizedNotebook.datasources?.length > 0
        ? normalizedNotebook.datasources
        : savedDatasources.data?.map((ds) => ds.id) || [];

    const description =
      normalizedNotebook.description &&
      normalizedNotebook.description.trim().length > 0
        ? normalizedNotebook.description
        : undefined;

    const { description: _ignoredDescription, ...notebookWithoutDescription } =
      normalizedNotebook;

    const notebookData: Notebook = {
      ...notebookWithoutDescription,
      createdAt: normalizedNotebook.createdAt ?? now,
      updatedAt: now,
      title: currentNotebookStateRef.current.title,
      datasources: notebookDatasources,
      ...(description ? { description } : {}),
      cells: currentNotebookStateRef.current.cells.map((cell) => ({
        query: cell.query,
        cellType: cell.cellType,
        cellId: cell.cellId,
        datasources: cell.datasources,
        isActive: cell.isActive ?? true,
        runMode: cell.runMode ?? 'default',
      })),
    };

    persistNotebook(notebookData);
  }, [normalizedNotebook, savedDatasources.data, persistNotebook]);

  const scheduleAutoSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 500);
  }, [handleSave]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const handleCellsChange = useCallback(
    (cells: NotebookCellData[]) => {
      if (!normalizedNotebook) {
        return;
      }

      const currentTitle =
        currentNotebookStateRef.current?.title ?? normalizedNotebook.title;
      currentNotebookStateRef.current = {
        cells,
        title: currentTitle,
      };
      scheduleAutoSave();
    },
    [normalizedNotebook, scheduleAutoSave],
  );

  const handleNotebookChange = useCallback(
    (changes: Partial<Notebook>) => {
      if (!normalizedNotebook) {
        return;
      }

      if (currentNotebookStateRef.current) {
        currentNotebookStateRef.current.title =
          changes.title ?? normalizedNotebook.title;
      } else {
        currentNotebookStateRef.current = {
          cells:
            normalizedNotebook.cells?.map((cell) => ({
              query: cell.query,
              cellId: cell.cellId,
              cellType: cell.cellType,
              datasources: cell.datasources,
              isActive: cell.isActive ?? true,
              runMode: cell.runMode ?? 'default',
            })) || [],
          title: changes.title ?? normalizedNotebook.title,
        };
      }
      scheduleAutoSave();
    },
    [normalizedNotebook, scheduleAutoSave],
  );

  const handleDeleteNotebook = useCallback(() => {
    if (!normalizedNotebook) {
      toast.error('Notebook is not ready yet');
      return;
    }

    const projectId = normalizedNotebook.projectId || workspace.projectId;

    if (!projectId) {
      toast.error('Unable to resolve project context for deletion');
      return;
    }

    deleteNotebookMutation.mutate({
      id: normalizedNotebook.id,
      slug: normalizedNotebook.slug,
      projectId,
    });
  }, [deleteNotebookMutation, normalizedNotebook, workspace.projectId]);

  useEffect(() => {
    if (!normalizedNotebook?.updatedAt) {
      return;
    }

    currentNotebookStateRef.current = null;
  }, [normalizedNotebook?.updatedAt]);

  // Map datasources to the format expected by NotebookUI
  const datasources = useMemo(() => {
    if (!savedDatasources.data) return [];
    return savedDatasources.data.map((ds) => ({
      id: ds.id,
      name: ds.name,
      provider: ds.datasource_provider,
      logo:
        ds.datasource_provider && pluginLogoMap.get(ds.datasource_provider)
          ? pluginLogoMap.get(ds.datasource_provider)
          : undefined,
    }));
  }, [savedDatasources.data, pluginLogoMap]);

  // Create loading states map
  const cellLoadingStates = new Map<number, boolean>();
  if (loadingCellId !== null) {
    cellLoadingStates.set(
      loadingCellId,
      runQueryMutation.isPending || runQueryWithAgentMutation.isPending,
    );
  }

  // Convert NotebookUseCaseDto to Notebook format
  return (
    <div className="h-full w-full overflow-hidden">
      {notebook.isLoading && <Skeleton className="h-full w-full" />}
      {notebook.isError && <Navigate to="/404" />}
      {normalizedNotebook && (
        <NotebookUI
          notebook={normalizedNotebook}
          datasources={datasources}
          onRunQuery={handleRunQuery}
          onCellsChange={handleCellsChange}
          onNotebookChange={handleNotebookChange}
          onRunQueryWithAgent={handleRunQueryWithAgent}
          cellResults={cellResults}
          cellErrors={cellErrors}
          cellLoadingStates={cellLoadingStates}
          onDeleteNotebook={handleDeleteNotebook}
          isDeletingNotebook={deleteNotebookMutation.isPending}
          workspaceMode={workspace.mode}
        />
      )}
    </div>
  );
}
