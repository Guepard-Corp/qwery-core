'use client';

import * as React from 'react';

import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Loader2, Pencil, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import type { DatasourceResultSet, Notebook } from '@qwery/domain/entities';
import { Button } from '@qwery/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@qwery/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@qwery/ui/dialog';
import { Input } from '@qwery/ui/input';

import { CellDivider } from './components/cell-divider';
import {
  NotebookCell,
  type NotebookCellData,
} from './components/notebook-cell';
import { NotebookDataGrid } from './components/notebook-datagrid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { useTheme } from 'next-themes';
import { Textarea } from '@qwery/ui/textarea';
import { Alert, AlertDescription } from '@qwery/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@qwery/ui/utils';

interface NotebookUIProps {
  notebook?: Notebook;
  initialCells?: NotebookCellData[];
  title?: string;
  datasources?: Array<{ id: string; name: string }>;
  onRunQuery?: (cellId: number, query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => void;
  onCellsChange?: (cells: NotebookCellData[]) => void;
  onNotebookChange?: (notebook: Partial<Notebook>) => void;
  cellResults?: Map<number, DatasourceResultSet>;
  cellErrors?: Map<number, string>;
  cellLoadingStates?: Map<number, boolean>;
  onDeleteNotebook?: () => void;
  isDeletingNotebook?: boolean;
}

// Sortable wrapper for cells
function SortableCell({
  cell,
  isCollapsed,
  onToggleCollapse,
  onQueryChange,
  onDatasourceChange,
  onRunQuery,
  onRunQueryWithAgent,
  datasources,
  result,
  error,
  isLoading,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onFormat,
  onDelete,
  onFullView,
  animatingCell,
  activeAiPopup,
  onOpenAiPopup,
  onCloseAiPopup,
}: {
  cell: NotebookCellData;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onQueryChange: (query: string) => void;
  onDatasourceChange: (datasourceId: string | null) => void;
  onRunQuery?: (query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (query: string, datasourceId: string) => void;
  datasources: Array<{ id: string; name: string }>;
  result?: DatasourceResultSet | null;
  error?: string;
  isLoading?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onFormat: () => void;
  onDelete: () => void;
  onFullView: () => void;
  animatingCell: { cellId: number; animation: string } | null;
  activeAiPopup: { cellId: number; position: { x: number; y: number } } | null;
  onOpenAiPopup: (cellId: number, position: { x: number; y: number }) => void;
  onCloseAiPopup: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: cell.cellId.toString(),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isAnimating = animatingCell?.cellId === cell.cellId;
  const animationType = isAnimating ? animatingCell.animation : null;

  // Disable layout animation during drag to prevent conflicts with dnd-kit
  // Only enable layout for button-based reordering (move-up/move-down)
  const shouldAnimateLayout =
    !isDragging &&
    (animationType === 'move-up' || animationType === 'move-down');

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={shouldAnimateLayout}
      layoutDependency={shouldAnimateLayout ? cell.cellId : undefined}
      initial={
        animationType === 'duplicate' || animationType === 'add'
          ? { opacity: 0, scale: 0.95, y: -10 }
          : false
      }
      animate={
        isDragging
          ? {}
          : animationType === 'duplicate' || animationType === 'add'
            ? { opacity: 1, scale: 1, y: 0 }
            : animationType === 'delete'
              ? { opacity: 0, scale: 0.95, y: -10 }
              : {}
      }
      exit={
        animationType === 'delete'
          ? { opacity: 0, scale: 0.95, y: -10 }
          : undefined
      }
      transition={
        isDragging
          ? { duration: 0 }
          : animationType === 'duplicate' || animationType === 'add'
            ? { duration: 0.3, ease: 'easeOut' }
            : animationType === 'delete'
              ? { duration: 0.2, ease: 'easeIn' }
              : shouldAnimateLayout
                ? { layout: { duration: 0.3, ease: 'easeInOut' } }
                : { duration: 0.3, ease: 'easeInOut' }
      }
    >
      <NotebookCell
        cell={cell}
        datasources={datasources}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onQueryChange={onQueryChange}
        onDatasourceChange={onDatasourceChange}
        onRunQuery={onRunQuery}
        onRunQueryWithAgent={onRunQueryWithAgent}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        result={result}
        error={error}
        isLoading={isLoading}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onFormat={onFormat}
        onDelete={onDelete}
        onFullView={onFullView}
        activeAiPopup={activeAiPopup}
        onOpenAiPopup={onOpenAiPopup}
        onCloseAiPopup={onCloseAiPopup}
      />
    </motion.div>
  );
}

function FullViewDialog({
  cellId,
  cells,
  cellResults,
  cellErrors,
  allDatasources,
  onQueryChange,
  onClose,
}: {
  cellId: number | null;
  cells: NotebookCellData[];
  cellResults: Map<number, DatasourceResultSet>;
  cellErrors: Map<number, string>;
  allDatasources: Array<{ id: string; name: string }>;
  onQueryChange: (cellId: number, query: string) => void;
  onClose: () => void;
}) {
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeMirrorContainerRef = useRef<HTMLDivElement>(null);

  const cell = cellId !== null ? cells.find((c) => c.cellId === cellId) : null;
  const result = cellId !== null ? cellResults.get(cellId) : undefined;
  const error = cellId !== null ? cellErrors.get(cellId) : undefined;
  const isQueryCell = cell?.cellType === 'query';
  const isTextCell = cell?.cellType === 'text';
  const isPromptCell = cell?.cellType === 'prompt';
  const query = cell?.query ?? '';

  const handleQueryChange = (value: string) => {
    if (cellId !== null) {
      onQueryChange(cellId, value);
    }
  };

  const selectedDatasource = React.useMemo(() => {
    if (!cell) return undefined;
    if (
      cell.datasources &&
      cell.datasources.length > 0 &&
      allDatasources &&
      allDatasources.length > 0
    ) {
      const cellDatasourceId = cell.datasources[0];
      const found = allDatasources.find((ds) => ds.id === cellDatasourceId);
      if (found) {
        return cellDatasourceId;
      }
    }
    if (allDatasources && allDatasources.length > 0 && allDatasources[0]) {
      return allDatasources[0].id;
    }
    return undefined;
  }, [cell, allDatasources]);

  useEffect(() => {
    if (cellId === null) return;

    const timer = setTimeout(() => {
      if (isQueryCell && codeMirrorContainerRef.current) {
        const contentElement = codeMirrorContainerRef.current.querySelector(
          '.cm-content',
        ) as HTMLElement;
        if (contentElement) {
          contentElement.focus();
        }
      } else if (!isQueryCell && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [cellId, isQueryCell]);

  if (cellId === null || !cell) {
    return null;
  }

  const datasourceName =
    allDatasources.find((ds) => ds.id === selectedDatasource)?.name ||
    selectedDatasource;

  return (
    <Dialog open={cellId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[95vh] max-w-[95vw] flex-col">
        <DialogHeader>
          <DialogTitle>
            {isQueryCell
              ? `Query Cell${datasourceName ? ` - ${datasourceName}` : ''}`
              : isTextCell
                ? 'Text Cell'
                : 'Prompt Cell'}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto">
          {/* Editor */}
          <div
            ref={codeMirrorContainerRef}
            className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 max-h-[50vh] min-h-[200px] flex-1 overflow-auto rounded-md border [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {isQueryCell ? (
              <CodeMirror
                value={query}
                onChange={handleQueryChange}
                extensions={[sql(), EditorView.lineWrapping]}
                theme={isDarkMode ? oneDark : undefined}
                editable={true}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: true,
                  dropCursor: false,
                  allowMultipleSelections: false,
                }}
                className="h-full [&_.cm-content]:px-4 [&_.cm-content]:py-2 [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm"
              />
            ) : (
              <Textarea
                ref={textareaRef}
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                className={cn(
                  'min-h-[200px] w-full resize-none border-0 text-sm',
                  'bg-transparent px-4 py-2 focus-visible:ring-0',
                  'leading-6',
                  isPromptCell && 'font-mono',
                )}
              />
            )}
          </div>

          {/* Results Grid */}
          {isQueryCell && result && (
            <div className="overflow-hidden rounded-md border">
              <div className="h-[60vh] min-h-[400px]">
                <NotebookDataGrid result={result} />
              </div>
            </div>
          )}

          {/* Error Display */}
          {isQueryCell && typeof error === 'string' && error.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DeleteNotebookButton({
  onDeleteNotebook,
  isDeleting,
  isHovering,
}: {
  onDeleteNotebook?: () => void;
  isDeleting?: boolean;
  isHovering?: boolean;
}) {
  const [open, setOpen] = useState(false);

  if (!onDeleteNotebook) {
    return null;
  }

  const handleConfirm = () => {
    if (isDeleting) {
      return;
    }
    setOpen(false);
    onDeleteNotebook();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 transition-opacity ${isHovering ? 'opacity-100' : 'opacity-0'}`}
          data-test="notebook-delete-trigger"
          disabled={isDeleting}
          aria-label="Delete notebook"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h4 className="leading-none font-semibold">Delete notebook?</h4>
            <p className="text-muted-foreground text-sm">
              This action permanently removes the notebook and all of its cells.
              You cannot undo this.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function NotebookUI({
  notebook,
  initialCells,
  title,
  datasources = [],
  onRunQuery,
  onRunQueryWithAgent,
  onCellsChange,
  onNotebookChange,
  cellResults: externalCellResults,
  cellErrors: externalCellErrors,
  cellLoadingStates: externalCellLoadingStates,
  onDeleteNotebook,
  isDeletingNotebook,
}: NotebookUIProps) {
  // Initialize cells from notebook or initialCells, default to empty array
  const [cells, setCells] = React.useState<NotebookCellData[]>(() => {
    if (notebook?.cells) {
      return notebook.cells.map((cell: Notebook['cells'][number]) => ({
        query: cell.query,
        cellId: cell.cellId,
        cellType: cell.cellType,
        datasources: cell.datasources,
        isActive: cell.isActive,
        runMode: cell.runMode,
      }));
    }
    if (initialCells) {
      return initialCells;
    }
    // Default: empty array
    return [];
  });

  const [collapsedCells, setCollapsedCells] = useState<Set<number>>(new Set());

  const [fullViewCellId, setFullViewCellId] = useState<number | null>(null);

  const [animatingCell, setAnimatingCell] = useState<{
    cellId: number;
    animation: 'move-up' | 'move-down' | 'duplicate' | 'delete' | 'add';
  } | null>(null);

  const [activeAiPopup, setActiveAiPopup] = useState<{
    cellId: number;
    position: { x: number; y: number };
  } | null>(null);

  const handleOpenAiPopup = useCallback(
    (cellId: number, position: { x: number; y: number }) => {
      setActiveAiPopup({ cellId, position });
    },
    [],
  );

  const handleCloseAiPopup = useCallback(() => {
    setActiveAiPopup(null);
  }, []);

  // Use external results if provided, otherwise use internal state
  const cellResults = externalCellResults ?? new Map();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Sync with notebook prop if provided
  React.useEffect(() => {
    if (notebook?.cells) {
      setCells(
        notebook.cells.map((cell: Notebook['cells'][number]) => ({
          query: cell.query,
          cellId: cell.cellId,
          cellType: cell.cellType,
          datasources: cell.datasources,
          isActive: cell.isActive,
          runMode: cell.runMode,
        })),
      );
    }
  }, [notebook?.cells]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setCells((items) => {
        const oldIndex = items.findIndex(
          (item) => item.cellId.toString() === active.id,
        );
        const newIndex = items.findIndex(
          (item) => item.cellId.toString() === over.id,
        );

        const newCells = arrayMove(items, oldIndex, newIndex);
        onCellsChange?.(newCells);
        return newCells;
      });
    }
  };

  const handleToggleCollapse = (cellId: number) => {
    setCollapsedCells((prev) => {
      const next = new Set(prev);
      if (next.has(cellId)) {
        next.delete(cellId);
      } else {
        next.add(cellId);
      }
      return next;
    });
  };

  const handleAddCell = (
    afterCellId?: number,
    cellType: 'query' | 'text' | 'prompt' = 'query',
  ) => {
    const maxCellId =
      cells.length > 0
        ? Math.max(...cells.map((c: NotebookCellData) => c.cellId), 0)
        : 0;
    const newCell: NotebookCellData = {
      query: '',
      cellId: maxCellId + 1,
      cellType,
      datasources:
        datasources.length > 0 && datasources[0] ? [datasources[0].id] : [],
      isActive: true,
      runMode: 'default',
    };

    if (afterCellId !== undefined) {
      const index = cells.findIndex(
        (c: NotebookCellData) => c.cellId === afterCellId,
      );
      const newCells = [
        ...cells.slice(0, index + 1),
        newCell,
        ...cells.slice(index + 1),
      ];
      setCells(newCells);
      onCellsChange?.(newCells);
      setAnimatingCell({ cellId: newCell.cellId, animation: 'add' });
      setTimeout(() => setAnimatingCell(null), 400);
    } else {
      const newCells = [...cells, newCell];
      setCells(newCells);
      onCellsChange?.(newCells);
      setAnimatingCell({ cellId: newCell.cellId, animation: 'add' });
      setTimeout(() => setAnimatingCell(null), 400);
    }
  };

  const handleQueryChange = (cellId: number, query: string) => {
    setCells((prev) => {
      const newCells = prev.map((cell) =>
        cell.cellId === cellId ? { ...cell, query } : cell,
      );
      onCellsChange?.(newCells);
      return newCells;
    });
  };

  const handleDatasourceChange = (
    cellId: number,
    datasourceId: string | null,
  ) => {
    setCells((prev) => {
      const newCells = prev.map((cell) =>
        cell.cellId === cellId
          ? { ...cell, datasources: datasourceId ? [datasourceId] : [] }
          : cell,
      );
      onCellsChange?.(newCells);
      return newCells;
    });
  };

  const handleRunQuery = (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => {
    onRunQuery?.(cellId, query, datasourceId);
  };

  const handleRunQueryWithAgent = (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => {
    onRunQueryWithAgent?.(cellId, query, datasourceId);
  };

  const handleMoveCellUp = (cellId: number) => {
    setCells((prev) => {
      const index = prev.findIndex((c) => c.cellId === cellId);
      if (index > 0) {
        const newCells = [...prev];
        const cell1 = newCells[index - 1];
        const cell2 = newCells[index];
        if (cell1 && cell2) {
          [newCells[index - 1], newCells[index]] = [cell2, cell1];
          onCellsChange?.(newCells);
          return newCells;
        }
      }
      return prev;
    });
  };

  const handleMoveCellDown = (cellId: number) => {
    setCells((prev) => {
      const index = prev.findIndex((c) => c.cellId === cellId);
      if (index < prev.length - 1) {
        const newCells = [...prev];
        const cell1 = newCells[index];
        const cell2 = newCells[index + 1];
        if (cell1 && cell2) {
          [newCells[index], newCells[index + 1]] = [cell2, cell1];
          onCellsChange?.(newCells);
          return newCells;
        }
      }
      return prev;
    });
  };

  const handleDuplicateCell = (cellId: number) => {
    setCells((prev) => {
      const cell = prev.find((c) => c.cellId === cellId);
      if (!cell) return prev;

      const maxCellId = Math.max(...prev.map((c) => c.cellId), 0);
      const newCell: NotebookCellData = {
        ...cell,
        cellId: maxCellId + 1,
      };

      const index = prev.findIndex((c) => c.cellId === cellId);
      const newCells = [
        ...prev.slice(0, index + 1),
        newCell,
        ...prev.slice(index + 1),
      ];
      onCellsChange?.(newCells);
      setAnimatingCell({ cellId: newCell.cellId, animation: 'duplicate' });
      setTimeout(() => setAnimatingCell(null), 500);
      return newCells;
    });
  };

  const handleFormatCell = (cellId: number) => {
    setCells((prev) => {
      const cell = prev.find((c) => c.cellId === cellId);
      if (!cell || !cell.query) return prev;

      // Basic SQL formatting - just trim for now, can be enhanced later
      const formattedQuery = cell.query.trim();
      if (formattedQuery === cell.query) return prev;

      const newCells = prev.map((c) =>
        c.cellId === cellId ? { ...c, query: formattedQuery } : c,
      );
      onCellsChange?.(newCells);
      return newCells;
    });
  };

  const handleDeleteCell = (cellId: number) => {
    setAnimatingCell({ cellId, animation: 'delete' });
    setTimeout(() => {
      setCells((prev) => {
        const newCells = prev.filter((c) => c.cellId !== cellId);
        onCellsChange?.(newCells);
        setAnimatingCell(null);
        return newCells;
      });
    }, 200);
  };

  const handleFullView = (cellId: number) => {
    setFullViewCellId(cellId);
  };

  // Get default title from notebook or prop
  const displayTitle = title || notebook?.title || '';
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(displayTitle);
  const headerTitle =
    (titleValue?.trim()?.length ? titleValue : displayTitle) ||
    'Untitled notebook';
  const shouldRenderHeader = Boolean(headerTitle || onDeleteNotebook);

  // State for editable title
  const [isHoveringTitle, setIsHoveringTitle] = React.useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // Sync title value when displayTitle changes
  React.useEffect(() => {
    setTitleValue(displayTitle);
  }, [displayTitle]);

  // Focus input when editing starts
  React.useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  const handleTitleSave = () => {
    const trimmed = titleValue.trim();
    const didChange = Boolean(trimmed) && trimmed !== displayTitle;

    if (didChange) {
      if (onNotebookChange) {
        onNotebookChange({ title: trimmed });
      }
    } else if (!trimmed) {
      setTitleValue(displayTitle);
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      setTitleValue(displayTitle);
      setIsEditingTitle(false);
    }
  };

  // Get all available datasources - combine notebook datasources with prop datasources
  const allDatasources = React.useMemo(() => {
    // Get datasource IDs from notebook
    const notebookDatasourceIds = notebook?.datasources || [];

    // If we have datasources prop with full info, use those
    if (datasources.length > 0) {
      // Merge notebook datasources with prop datasources, removing duplicates
      const allIds = new Set([
        ...notebookDatasourceIds,
        ...datasources.map((ds) => ds.id),
      ]);
      return Array.from(allIds).map((id) => {
        const found = datasources.find((ds) => ds.id === id);
        return found || { id, name: id }; // Fallback to ID as name if not found
      });
    }

    // If no datasources prop, create objects from notebook datasource IDs
    return notebookDatasourceIds.map((id: string) => ({ id, name: id }));
  }, [notebook?.datasources, datasources]);

  return (
    <div className="bg-background flex h-full min-h-0 flex-col overflow-hidden">
      {/* Title / Actions */}
      {shouldRenderHeader && (
        <div
          className="border-border border-b px-6 py-4"
          onMouseEnter={() => setIsHoveringTitle(true)}
          onMouseLeave={() => setIsHoveringTitle(false)}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-1 items-center">
              {isEditingTitle ? (
                <Input
                  ref={titleInputRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={handleTitleKeyDown}
                  className="focus-visible:ring-ring h-auto w-full border-0 bg-transparent px-0 py-0 text-2xl font-semibold focus-visible:ring-2"
                />
              ) : (
                <div className="group flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{headerTitle}</h1>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 transition-opacity ${isHoveringTitle ? 'opacity-100' : 'opacity-0'}`}
                    onClick={() => setIsEditingTitle(true)}
                    aria-label="Edit title"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <DeleteNotebookButton
                    onDeleteNotebook={onDeleteNotebook}
                    isDeleting={isDeletingNotebook}
                    isHovering={isHoveringTitle}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2" />
          </div>
        </div>
      )}

      {/* Cells container */}
      <div className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 min-h-0 flex-1 overflow-x-hidden overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={cells.map((c) => c.cellId.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col">
              <AnimatePresence mode="popLayout">
                {cells.map((cell, index) => {
                  // Get error for this specific cell only - ensure strict isolation
                  let cellError: string | undefined = undefined;
                  if (externalCellErrors && externalCellErrors instanceof Map) {
                    const error = externalCellErrors.get(cell.cellId);
                    if (typeof error === 'string' && error.trim().length > 0) {
                      cellError = error;
                    }
                  }

                  // Get loading state for this cell
                  const isLoading =
                    externalCellLoadingStates?.get(cell.cellId) ?? false;

                  return (
                    <React.Fragment key={cell.cellId}>
                      <SortableCell
                        cell={cell}
                        isCollapsed={collapsedCells.has(cell.cellId)}
                        onToggleCollapse={() =>
                          handleToggleCollapse(cell.cellId)
                        }
                        onQueryChange={(query) =>
                          handleQueryChange(cell.cellId, query)
                        }
                        onDatasourceChange={(datasourceId) =>
                          handleDatasourceChange(cell.cellId, datasourceId)
                        }
                        onRunQuery={(query, datasourceId) => {
                          handleRunQuery(cell.cellId, query, datasourceId);
                        }}
                        onRunQueryWithAgent={(query, datasourceId) => {
                          handleRunQueryWithAgent(
                            cell.cellId,
                            query,
                            datasourceId,
                          );
                        }}
                        datasources={allDatasources}
                        result={cellResults.get(cell.cellId)}
                        error={cellError}
                        isLoading={isLoading}
                        onMoveUp={() => handleMoveCellUp(cell.cellId)}
                        onMoveDown={() => handleMoveCellDown(cell.cellId)}
                        onDuplicate={() => handleDuplicateCell(cell.cellId)}
                        onFormat={() => handleFormatCell(cell.cellId)}
                        onDelete={() => handleDeleteCell(cell.cellId)}
                        onFullView={() => handleFullView(cell.cellId)}
                        animatingCell={animatingCell}
                        activeAiPopup={activeAiPopup}
                        onOpenAiPopup={handleOpenAiPopup}
                        onCloseAiPopup={handleCloseAiPopup}
                      />
                      {index < cells.length - 1 && (
                        <CellDivider
                          onAddCell={(type: 'query' | 'text' | 'prompt') =>
                            handleAddCell(cell.cellId, type)
                          }
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </AnimatePresence>
              {/* Divider at the end */}
              <CellDivider
                onAddCell={(type: 'query' | 'text' | 'prompt') =>
                  handleAddCell(undefined, type)
                }
              />
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Full View Dialog */}
      <FullViewDialog
        cellId={fullViewCellId}
        cells={cells}
        cellResults={cellResults}
        cellErrors={externalCellErrors ?? new Map()}
        allDatasources={allDatasources}
        onQueryChange={handleQueryChange}
        onClose={() => setFullViewCellId(null)}
      />
    </div>
  );
}

export default NotebookUI;
