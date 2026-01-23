import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Navigate, useBlocker, useNavigate, useParams } from 'react-router';

import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@qwery/ui/dialog';
import { Button } from '@qwery/ui/button';

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
import { getAllExtensionMetadata } from '@qwery/extensions-loader';
import { useNotebookSidebar } from '~/lib/context/notebook-sidebar-context';
import { useGetNotebookConversation } from '~/lib/queries/use-get-notebook-conversation';
import {
  NOTEBOOK_CELL_TYPE,
  type NotebookCellType,
} from '@qwery/agent-factory-sdk';
import { scrollToElementBySelector } from '@qwery/ui/ai';

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

  // Load conversation for this notebook
  const notebookConversation = useGetNotebookConversation(
    repositories.conversation,
    notebook.data?.id,
    workspace.projectId || undefined,
  );

  // Switch conversation when notebook changes
  // Only update URL if conversation exists and is different from current
  // Don't remove conversation param if it doesn't exist yet - let it be created on first prompt
  // This prevents race conditions and preserves sidebar state on refresh
  useEffect(() => {
    if (notebookConversation.data?.slug) {
      // Update URL with this notebook's conversation
      const currentUrl = new URL(window.location.href);
      const currentConversation = currentUrl.searchParams.get('conversation');

      // Only update if the conversation is different
      // This ensures we don't cause unnecessary re-renders
      if (currentConversation !== notebookConversation.data.slug) {
        currentUrl.searchParams.set(
          'conversation',
          notebookConversation.data.slug,
        );
        navigate(currentUrl.pathname + currentUrl.search, { replace: true });
      }
    }
    // Don't remove conversation param if notebook exists but no conversation yet
    // The conversation will be created when first prompt is sent
    // Removing it would cause the sidebar to close unnecessarily
  }, [notebookConversation.data?.slug, navigate]);

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
    },
  );

  const handleRunQuery = useCallback(
    (cellId: number, query: string, datasourceId: string) => {
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
        conversationId: notebookConversation.data?.slug, // Pass conversationSlug for DuckDB execution (Google Sheets)
      });
    },
    [savedDatasources.data, runQueryMutation, notebookConversation.data?.slug],
  );

  // Run query with agent mutation
  const {
    openSidebar,
    registerSqlPasteHandler,
    unregisterSqlPasteHandler,
    registerLoadingStateCallback,
    unregisterLoadingStateCallback,
  } = useNotebookSidebar();

  const runQueryWithAgentMutation = useRunQueryWithAgent(
    (result, cellId, datasourceId) => {
      const cell = normalizedNotebook?.cells.find((c) => c.cellId === cellId);
      const cellType = cell?.cellType;
      const notebookCellType: NotebookCellType | undefined =
        cellType === NOTEBOOK_CELL_TYPE.QUERY ||
        cellType === NOTEBOOK_CELL_TYPE.PROMPT
          ? (cellType as NotebookCellType)
          : undefined;

      console.log('[Notebook] runQueryWithAgent success callback:', {
        cellId,
        cellType,
        notebookCellType,
        hasSql: result.hasSql,
        needSQL: result.needSQL,
        shouldPaste: result.shouldPaste,
        hasSqlQuery: !!result.sqlQuery,
      });

      // Check if this is inline mode and needs SQL pasting
      // shouldPaste comes from the tool result (set when promptSource === 'inline' && needSQL === true)
      const shouldPaste = result.shouldPaste === true && result.sqlQuery;

      if (shouldPaste && result.sqlQuery) {
        // Guard against unmount: check if notebook still exists
        if (!normalizedNotebook || !normalizedNotebook.cells) {
          console.warn(
            '[Notebook] Cannot paste SQL: notebook unmounted or cells unavailable',
          );
          return;
        }

        console.log('[Notebook] Pasting SQL to notebook cell:', {
          cellId,
          cellType,
          notebookCellType,
          sqlPreview: result.sqlQuery.substring(0, 100),
        });
        // Inline mode with SQL: paste SQL into notebook cell
        if (cellType === NOTEBOOK_CELL_TYPE.QUERY) {
          // Code cell: paste SQL directly
          console.log('[Notebook] Pasting SQL to existing code cell:', cellId);
          handleCellsChange(
            normalizedNotebook.cells.map((c) =>
              c.cellId === cellId ? { ...c, query: result.sqlQuery! } : c,
            ),
          );
          // Simulate click to run query
          console.log('[Notebook] Auto-running query after paste');
          handleRunQuery(cellId, result.sqlQuery, datasourceId);
        } else if (cellType === NOTEBOOK_CELL_TYPE.PROMPT) {
          // Prompt cell: create new code cell with SQL
          const maxCellId = Math.max(
            ...normalizedNotebook.cells.map((c) => c.cellId),
            0,
          );
          const newCellId = maxCellId + 1;
          console.log('[Notebook] Creating new code cell with SQL:', newCellId);
          const newCodeCell: NotebookCellData = {
            cellId: newCellId,
            cellType: NOTEBOOK_CELL_TYPE.QUERY,
            query: result.sqlQuery,
            datasources: [datasourceId],
            isActive: true,
            runMode: 'default',
          };
          handleCellsChange([...normalizedNotebook.cells, newCodeCell]);
          // Simulate click to run query on the new cell
          console.log('[Notebook] Auto-running query on new cell');
          handleRunQuery(newCellId, result.sqlQuery, datasourceId);
        }
      } else if (result.hasSql && result.sqlQuery) {
        // SQL generation path (chat mode): execute SQL normally
        console.log('[Notebook] Executing SQL normally (chat mode)');
        handleRunQuery(cellId, result.sqlQuery, datasourceId);
      } else {
        // Chat path: open sidebar with the conversation and send message for streaming
        const query = cell?.query || '';

        // Open sidebar and send message through chat interface for proper streaming
        // Pass cellType and cellId so the chat API can set notebookCellType in metadata
        openSidebar(result.conversationSlug, {
          datasourceId,
          messageToSend: query, // Send the message through chat interface for streaming
          notebookCellType,
          cellId,
        });
      }
      setLoadingCellId(null);
    },
    (error, cellId, query) => {
      setCellErrors((prev) => {
        const next = new Map(prev);
        next.set(
          cellId,
          `${error.message} 
          query: ${query}`,
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

  const handleRunQueryWithAgent = async (
    cellId: number,
    query: string,
    datasourceId: string,
    cellType?: NotebookCellType,
  ) => {
    setLoadingCellId(cellId);
    telemetry.trackEvent(NOTEBOOK_EVENTS.NOTEBOOK_RUN_QUERY, {
      query,
      datasourceName: datasourceId,
    });

    // Determine cellType from the actual cell if not provided
    // This ensures we always have a cellType when opening the sidebar
    const cell = normalizedNotebook?.cells.find((c) => c.cellId === cellId);
    const actualCellType: NotebookCellType =
      cellType ||
      (cell?.cellType === NOTEBOOK_CELL_TYPE.QUERY ||
      cell?.cellType === NOTEBOOK_CELL_TYPE.PROMPT
        ? (cell.cellType as NotebookCellType)
        : NOTEBOOK_CELL_TYPE.PROMPT); // Default to 'prompt' if cellType is not 'query' or 'prompt'

    console.log('[Notebook] handleRunQueryWithAgent called:', {
      cellId,
      providedCellType: cellType,
      actualCellType,
      cellCellType: cell?.cellType,
    });

    if (notebook.data?.id) {
      // Get or create conversation for this notebook
      let conversationSlug: string;
      const existingConversation = notebookConversation.data;

      if (existingConversation) {
        conversationSlug = existingConversation.slug;
        // Update datasources if needed
        if (!existingConversation.datasources?.includes(datasourceId)) {
          await repositories.conversation.update({
            ...existingConversation,
            datasources: [
              ...(existingConversation.datasources || []),
              datasourceId,
            ],
            updatedBy: workspace.username || workspace.userId || 'system',
            updatedAt: new Date(),
          });
        }
      } else {
        // Create new conversation
        const { v4: uuidv4 } = await import('uuid');
        const conversationId = uuidv4();
        const now = new Date();
        const notebookTitle = `Notebook - ${notebook.data.id}`;

        const newConversation = await repositories.conversation.create({
          id: conversationId,
          slug: '', // Repository will generate slug
          title: notebookTitle,
          projectId: workspace.projectId || '',
          taskId: uuidv4(),
          datasources: [datasourceId],
          createdAt: now,
          updatedAt: now,
          createdBy: workspace.userId || 'system',
          updatedBy: workspace.username || workspace.userId || 'system',
          seedMessage: '',
          isPublic: false,
        });
        conversationSlug = newConversation.slug;
      }

      // Open sidebar and send message through chat interface for proper streaming
      // Pass cellType and cellId so the chat API can set notebookCellType in metadata
      // Always pass actualCellType to ensure it's never undefined
      openSidebar(conversationSlug, {
        datasourceId,
        messageToSend: query, // This will be sent through chat interface and stream properly
        notebookCellType: actualCellType, // Always pass cellType (either 'query' or 'prompt')
        cellId, // Pass cellId to track which cell is loading
      });

      // Loading state will be synced with chat interface streaming state
      // Don't clear it here - it will be cleared when streaming completes
    } else {
      // Notebook not loaded yet - show error and don't proceed
      toast.error('Notebook not loaded yet, please wait');
      setLoadingCellId(null);
    }
  };

  const normalizedNotebook: Notebook | undefined = !notebook.data
    ? undefined
    : (() => {
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
            title: cell.title,
          })),
        } as Notebook;
      })();

  // Track current unsaved state
  const currentNotebookStateRef = useRef<{
    cells: NotebookCellData[];
    title: string;
  } | null>(null);

  // Track last saved state for comparison
  const lastSavedStateRef = useRef<{
    cells: NotebookCellData[];
    title: string;
  } | null>(null);

  // Track previous updatedAt to detect actual saves
  const previousUpdatedAtRef = useRef<string | Date | undefined>(undefined);

  // Dialog state for unsaved changes
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<
    (() => void) | null
  >(null);
  const [hasUnsavedChangesState, setHasUnsavedChangesState] = useState(false);

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (!currentNotebookStateRef.current || !lastSavedStateRef.current) {
      return false;
    }

    const current = currentNotebookStateRef.current;
    const saved = lastSavedStateRef.current;

    // Check title change
    if (current.title !== saved.title) {
      return true;
    }

    // Check cells length
    if (current.cells.length !== saved.cells.length) {
      return true;
    }

    // Check each cell for changes
    for (let i = 0; i < current.cells.length; i++) {
      const currentCell = current.cells[i];
      const savedCell = saved.cells[i];

      if (!currentCell || !savedCell) return true;

      if (
        currentCell.cellId !== savedCell.cellId ||
        currentCell.cellType !== savedCell.cellType ||
        currentCell.query !== savedCell.query ||
        JSON.stringify(currentCell.datasources) !==
          JSON.stringify(savedCell.datasources) ||
        currentCell.isActive !== savedCell.isActive ||
        currentCell.runMode !== savedCell.runMode ||
        (currentCell.title || '') !== (savedCell.title || '')
      ) {
        return true;
      }
    }

    return false;
  }, []);

  // Helper function to update unsaved notebook state in localStorage
  const updateUnsavedState = useCallback(() => {
    if (!normalizedNotebook?.slug) return;

    const storageKey = 'notebook:unsaved';
    const hasUnsaved = hasUnsavedChanges();
    setHasUnsavedChangesState(hasUnsaved);

    try {
      const unsavedSlugs = JSON.parse(
        localStorage.getItem(storageKey) || '[]',
      ) as string[];

      if (hasUnsaved) {
        // Add slug if not already present
        if (!unsavedSlugs.includes(normalizedNotebook.slug)) {
          localStorage.setItem(
            storageKey,
            JSON.stringify([...unsavedSlugs, normalizedNotebook.slug]),
          );
        }
      } else {
        // Remove slug if present
        const updated = unsavedSlugs.filter(
          (s) => s !== normalizedNotebook.slug,
        );
        localStorage.setItem(storageKey, JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Failed to update unsaved notebook state:', error);
    }
  }, [normalizedNotebook?.slug, hasUnsavedChanges]);

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
        title: cell.title,
      })),
    };

    persistNotebook(notebookData);

    // Update last saved state after save (deep copy)
    if (currentNotebookStateRef.current) {
      lastSavedStateRef.current = {
        cells: currentNotebookStateRef.current.cells.map((cell) => ({
          ...cell,
          datasources: [...cell.datasources],
          title: cell.title,
        })),
        title: currentNotebookStateRef.current.title,
      };
    }

    // Clear unsaved state after save
    setHasUnsavedChangesState(false);
    if (normalizedNotebook?.slug) {
      const storageKey = 'notebook:unsaved';
      try {
        const unsavedSlugs = JSON.parse(
          localStorage.getItem(storageKey) || '[]',
        ) as string[];
        const updated = unsavedSlugs.filter(
          (s) => s !== normalizedNotebook.slug,
        );
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to clear unsaved notebook state:', error);
      }
    }
  }, [normalizedNotebook, savedDatasources.data, persistNotebook]);

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
      // Update unsaved state immediately
      updateUnsavedState();
    },
    [normalizedNotebook, updateUnsavedState],
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
              title: cell.title,
            })) || [],
          title: changes.title ?? normalizedNotebook.title,
        };
      }
      // Update unsaved state immediately
      updateUnsavedState();
    },
    [normalizedNotebook, updateUnsavedState],
  );

  // Ctrl+S keyboard shortcut to save notebook
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isModKeyPressed = isMac ? event.metaKey : event.ctrlKey;

      if (isModKeyPressed && event.key === 's') {
        event.preventDefault();
        handleSave();
        toast.success('Notebook saved');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

  // Block navigation when there are unsaved changes
  const blocker = useBlocker(({ currentLocation, nextLocation }) => {
    // Only block if navigating to a different notebook or leaving notebook page
    const isDifferentNotebook =
      currentLocation.pathname.startsWith('/notebook/') &&
      nextLocation.pathname.startsWith('/notebook/') &&
      currentLocation.pathname !== nextLocation.pathname;

    const isLeavingNotebook =
      currentLocation.pathname.startsWith('/notebook/') &&
      !nextLocation.pathname.startsWith('/notebook/');

    return hasUnsavedChanges() && (isDifferentNotebook || isLeavingNotebook);
  });

  useEffect(() => {
    if (blocker.state === 'blocked') {
      setPendingNavigation(() => blocker.proceed);
      setShowUnsavedDialog(true);
    }
  }, [blocker.state, blocker.proceed]);

  // Handle dialog actions
  const handleSaveAndContinue = useCallback(async () => {
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
        title: cell.title,
      })),
    };

    try {
      await saveNotebookMutation.mutateAsync(notebookData);

      if (currentNotebookStateRef.current) {
        lastSavedStateRef.current = {
          cells: currentNotebookStateRef.current.cells.map((cell) => ({
            ...cell,
            datasources: [...cell.datasources],
            title: cell.title,
          })),
          title: currentNotebookStateRef.current.title,
        };
      }

      setHasUnsavedChangesState(false);
      if (normalizedNotebook?.slug) {
        const storageKey = 'notebook:unsaved';
        try {
          const unsavedSlugs = JSON.parse(
            localStorage.getItem(storageKey) || '[]',
          ) as string[];
          const updated = unsavedSlugs.filter(
            (s) => s !== normalizedNotebook.slug,
          );
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch (error) {
          console.error('Failed to clear unsaved notebook state:', error);
        }
      }

      setShowUnsavedDialog(false);
      if (pendingNavigation) {
        pendingNavigation();
        setPendingNavigation(null);
      }
      toast.success('Notebook saved');
    } catch (error) {
      console.error('Failed to save notebook:', error);
      toast.error('Failed to save notebook. Please try again.');
    }
  }, [
    normalizedNotebook,
    savedDatasources.data,
    saveNotebookMutation,
    pendingNavigation,
  ]);

  const handleDiscardAndContinue = useCallback(() => {
    if (normalizedNotebook?.slug) {
      const storageKey = 'notebook:unsaved';
      try {
        const unsavedSlugs = JSON.parse(
          localStorage.getItem(storageKey) || '[]',
        ) as string[];
        const updated = unsavedSlugs.filter(
          (s) => s !== normalizedNotebook.slug,
        );
        localStorage.setItem(storageKey, JSON.stringify(updated));
        setHasUnsavedChangesState(false);
      } catch (error) {
        console.error('Failed to clear unsaved state:', error);
      }
    }

    setShowUnsavedDialog(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation, normalizedNotebook?.slug]);

  const handleCancelNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    if (blocker.state === 'blocked') {
      blocker.reset();
    }
    setPendingNavigation(null);
  }, [blocker]);

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

    const currentUpdatedAt = normalizedNotebook.updatedAt;
    const previousUpdatedAt = previousUpdatedAtRef.current;

    const isNewSave =
      previousUpdatedAt !== undefined && previousUpdatedAt !== currentUpdatedAt;

    if (
      normalizedNotebook.cells &&
      (previousUpdatedAt === undefined || isNewSave)
    ) {
      const savedState = {
        cells: normalizedNotebook.cells.map((cell) => ({
          query: cell.query ?? '',
          cellId: cell.cellId,
          cellType: cell.cellType,
          datasources: [...(cell.datasources || [])],
          isActive: cell.isActive ?? true,
          runMode: cell.runMode ?? 'default',
          title: cell.title,
        })),
        title: normalizedNotebook.title,
      };
      lastSavedStateRef.current = savedState;

      // Only reset current state if this is a new save (not on initial load with existing unsaved changes)
      if (isNewSave) {
        // This is a save - reset current state to match saved state
        currentNotebookStateRef.current = {
          cells: savedState.cells.map((cell) => ({
            ...cell,
            datasources: [...cell.datasources],
            title: cell.title,
          })),
          title: savedState.title,
        };
        setHasUnsavedChangesState(false);
      } else if (previousUpdatedAt === undefined) {
        currentNotebookStateRef.current = {
          cells: savedState.cells.map((cell) => ({
            ...cell,
            datasources: [...cell.datasources],
            title: cell.title,
          })),
          title: savedState.title,
        };
        const storageKey = 'notebook:unsaved';
        try {
          const unsavedSlugs = JSON.parse(
            localStorage.getItem(storageKey) || '[]',
          ) as string[];
          const hasUnsaved = unsavedSlugs.includes(normalizedNotebook.slug);
          setHasUnsavedChangesState(hasUnsaved);
        } catch {
          setHasUnsavedChangesState(false);
        }
      }

      previousUpdatedAtRef.current = currentUpdatedAt;
    }
  }, [
    normalizedNotebook?.updatedAt,
    normalizedNotebook?.cells,
    normalizedNotebook?.title,
    normalizedNotebook?.slug,
  ]);

  useEffect(() => {
    const handleSqlPaste = (
      sqlQuery: string,
      notebookCellType: NotebookCellType,
      datasourceId: string,
      cellId: number,
    ) => {
      console.log('[Notebook] SQL paste handler called:', {
        cellId,
        notebookCellType,
        datasourceId,
        sqlPreview: sqlQuery.substring(0, 100),
        sqlLength: sqlQuery.length,
      });

      if (!normalizedNotebook) {
        console.warn('[Notebook] Cannot paste SQL - notebook not loaded');
        return;
      }

      let targetCellId = cellId;
      const isNewCell = notebookCellType === NOTEBOOK_CELL_TYPE.PROMPT;

      if (isNewCell) {
        const maxCellId = Math.max(
          ...normalizedNotebook.cells.map((c) => c.cellId),
          0,
        );
        targetCellId = maxCellId + 1;
      }

      const cellSelector = `[data-cell-id="${targetCellId}"]`;
      const scrollDelay = 100; // Small delay before scrolling
      const pasteDelay = 600; // Delay after scroll before pasting (allows scroll animation)
      const runDelay = 400; // Delay after paste before running

      if (isNewCell) {
        console.log(
          '[Notebook] Creating new code cell with SQL:',
          targetCellId,
        );
        const newCodeCell: NotebookCellData = {
          cellId: targetCellId,
          cellType: NOTEBOOK_CELL_TYPE.QUERY,
          query: sqlQuery,
          datasources: [datasourceId],
          isActive: true,
          runMode: 'default',
        };
        handleCellsChange([...normalizedNotebook.cells, newCodeCell]);

        setTimeout(() => {
          scrollToElementBySelector(cellSelector, {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
            offset: -20,
            maxRetries: 5,
            enableHighlight: true,
            highlightDuration: 2000,
          });

          setTimeout(() => {
            console.log('[Notebook] Auto-running query on new cell');
            handleRunQuery(targetCellId, sqlQuery, datasourceId);
          }, pasteDelay + runDelay);
        }, scrollDelay);
      } else {
        setTimeout(() => {
          scrollToElementBySelector(cellSelector, {
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
            offset: -20,
            maxRetries: 3,
            enableHighlight: true,
            highlightDuration: 2000,
          });

          setTimeout(() => {
            console.log(
              '[Notebook] Pasting SQL to existing code cell:',
              cellId,
            );
            handleCellsChange(
              normalizedNotebook.cells.map((c) =>
                c.cellId === cellId ? { ...c, query: sqlQuery } : c,
              ),
            );

            // Wait a bit more, then auto-run query
            setTimeout(() => {
              console.log('[Notebook] Auto-running query after paste');
              handleRunQuery(cellId, sqlQuery, datasourceId);
            }, runDelay);
          }, pasteDelay);
        }, scrollDelay);
      }
    };

    registerSqlPasteHandler(handleSqlPaste);
    return () => {
      unregisterSqlPasteHandler();
    };
  }, [
    normalizedNotebook,
    handleCellsChange,
    handleRunQuery,
    registerSqlPasteHandler,
    unregisterSqlPasteHandler,
  ]);

  // Register loading state callback to sync with chat interface
  useEffect(() => {
    const handleLoadingStateChange = (
      cellId: number | undefined,
      isProcessing: boolean,
    ) => {
      if (cellId !== undefined) {
        if (isProcessing) {
          // Chat is processing - keep cell loading
          setLoadingCellId(cellId);
        } else {
          // Chat finished processing - clear cell loading
          if (loadingCellId === cellId) {
            setLoadingCellId(null);
          }
        }
      }
    };

    registerLoadingStateCallback(handleLoadingStateChange);
    return () => {
      unregisterLoadingStateCallback();
    };
  }, [
    loadingCellId,
    registerLoadingStateCallback,
    unregisterLoadingStateCallback,
  ]);

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

  const isNotebookLoading = notebook.isLoading || savedDatasources.isLoading;

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
          onSave={handleSave}
          onRunQueryWithAgent={handleRunQueryWithAgent}
          cellResults={cellResults}
          cellErrors={cellErrors}
          cellLoadingStates={cellLoadingStates}
          onDeleteNotebook={handleDeleteNotebook}
          isDeletingNotebook={deleteNotebookMutation.isPending}
          workspaceMode={workspace.mode}
          hasUnsavedChanges={hasUnsavedChangesState}
          isNotebookLoading={isNotebookLoading}
        />
      )}

      {/* Unsaved changes dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes in this notebook. What would you like to
              do?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleCancelNavigation}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleDiscardAndContinue}>
              Discard Changes
            </Button>
            <Button
              onClick={handleSaveAndContinue}
              disabled={saveNotebookMutation.isPending}
            >
              {saveNotebookMutation.isPending ? 'Saving...' : 'Save & Continue'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
