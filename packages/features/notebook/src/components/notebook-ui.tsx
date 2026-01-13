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
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  BookText,
  DatabaseIcon,
  Loader2,
  Pencil,
  Plus,
  Save,
  Sparkles,
  Trash2,
  Type,
  X,
} from 'lucide-react';

import type { DatasourceResultSet, Notebook } from '@qwery/domain/entities';
import { WorkspaceModeEnum, type CellType } from '@qwery/domain/enums';
import { Button } from '@qwery/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@qwery/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@qwery/ui/dialog';
import { Input } from '@qwery/ui/input';

import { CellDivider } from './cell-divider';
import {
  NotebookCell,
  type NotebookCellData,
  type NotebookDatasourceInfo,
} from './notebook-cell';
import { DataGrid } from '@qwery/ui/ai';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import { useTheme } from 'next-themes';
import { Textarea } from '@qwery/ui/textarea';
import { Alert, AlertDescription } from '@qwery/ui/alert';
import { AlertCircle } from 'lucide-react';
import { cn } from '@qwery/ui/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { Shortcuts } from '@qwery/ui/shortcuts';

interface NotebookUIProps {
  notebook?: Notebook;
  initialCells?: NotebookCellData[];
  title?: string;
  datasources?: NotebookDatasourceInfo[];
  onRunQuery?: (cellId: number, query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => void;
  onCellsChange?: (cells: NotebookCellData[]) => void;
  onNotebookChange?: (notebook: Partial<Notebook>) => void;
  onSave?: () => void;
  cellResults?: Map<number, DatasourceResultSet>;
  cellErrors?: Map<number, string>;
  cellLoadingStates?: Map<number, boolean>;
  onDeleteNotebook?: () => void;
  isDeletingNotebook?: boolean;
  workspaceMode?: WorkspaceModeEnum;
  hasUnsavedChanges?: boolean;
}

// Sortable wrapper for cells
const SortableCell = React.memo(function SortableCellComponent({
  cell,
  onQueryChange,
  onTitleChange,
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
  isAdvancedMode,
  activeAiPopup,
  onOpenAiPopup,
  onCloseAiPopup,
}: {
  cell: NotebookCellData;
  onQueryChange: (cellId: number, query: string) => void;
  onTitleChange?: (cellId: number, title: string) => void;
  onDatasourceChange: (cellId: number, datasourceId: string | null) => void;
  onRunQuery?: (cellId: number, query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (
    cellId: number,
    query: string,
    datasourceId: string,
  ) => void;
  datasources: NotebookDatasourceInfo[];
  result?: DatasourceResultSet | null;
  error?: string;
  isLoading?: boolean;
  onMoveUp: (cellId: number) => void;
  onMoveDown: (cellId: number) => void;
  onDuplicate: (cellId: number) => void;
  onFormat: (cellId: number) => void;
  onDelete: (cellId: number) => void;
  onFullView: (cellId: number) => void;
  isAdvancedMode: boolean;
  activeAiPopup: { cellId: number; position: { x: number; y: number } } | null;
  onOpenAiPopup: (cellId: number, position: { x: number; y: number }) => void;
  onCloseAiPopup: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
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

  const handleQueryChange = useCallback(
    (value: string) => {
      onQueryChange(cell.cellId, value);
    },
    [cell.cellId, onQueryChange],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      onTitleChange?.(cell.cellId, title);
    },
    [cell.cellId, onTitleChange],
  );

  const handleDatasourceChange = useCallback(
    (datasourceId: string | null) => {
      onDatasourceChange(cell.cellId, datasourceId);
    },
    [cell.cellId, onDatasourceChange],
  );

  const handleRunQuery = useCallback(
    (query: string, datasourceId: string) => {
      onRunQuery?.(cell.cellId, query, datasourceId);
    },
    [cell.cellId, onRunQuery],
  );

  const handleRunQueryWithAgent = useCallback(
    (query: string, datasourceId: string, _cellType?: 'query' | 'prompt') => {
      onRunQueryWithAgent?.(cell.cellId, query, datasourceId);
    },
    [cell.cellId, onRunQueryWithAgent],
  );

  const handleMoveUp = useCallback(() => {
    onMoveUp(cell.cellId);
  }, [cell.cellId, onMoveUp]);

  const handleMoveDown = useCallback(() => {
    onMoveDown(cell.cellId);
  }, [cell.cellId, onMoveDown]);

  const handleDuplicate = useCallback(() => {
    onDuplicate(cell.cellId);
  }, [cell.cellId, onDuplicate]);

  const handleFormat = useCallback(() => {
    onFormat(cell.cellId);
  }, [cell.cellId, onFormat]);

  const handleDelete = useCallback(() => {
    onDelete(cell.cellId);
  }, [cell.cellId, onDelete]);

  const handleFullView = useCallback(() => {
    onFullView(cell.cellId);
  }, [cell.cellId, onFullView]);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      style={{
        ...style,
        transition: isDragging
          ? 'transform 0s'
          : 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
      className="group relative transition-opacity duration-200 ease-out data-[dragging=true]:opacity-80"
      data-dragging={isDragging ? 'true' : 'false'}
    >
      <NotebookCell
        cell={cell}
        datasources={datasources}
        onQueryChange={handleQueryChange}
        onTitleChange={handleTitleChange}
        onDatasourceChange={handleDatasourceChange}
        onRunQuery={handleRunQuery}
        onRunQueryWithAgent={handleRunQueryWithAgent}
        dragHandleProps={listeners}
        dragHandleRef={setActivatorNodeRef}
        isDragging={isDragging}
        result={result}
        error={error}
        isLoading={isLoading}
        onMoveUp={handleMoveUp}
        onMoveDown={handleMoveDown}
        onDuplicate={handleDuplicate}
        onFormat={handleFormat}
        onDelete={handleDelete}
        onFullView={handleFullView}
        isAdvancedMode={isAdvancedMode}
        activeAiPopup={activeAiPopup}
        onOpenAiPopup={onOpenAiPopup}
        onCloseAiPopup={onCloseAiPopup}
      />
    </div>
  );
});

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
  allDatasources: NotebookDatasourceInfo[];
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
        return found;
      }
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

  const renderDatasourceDisplay = () => {
    if (!selectedDatasource || !isQueryCell) return null;
    
    const displayName = selectedDatasource.name || selectedDatasource.id;
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {selectedDatasource.logo ? (
          <img
            src={selectedDatasource.logo}
            alt={`${displayName} logo`}
            className="h-4 w-4 rounded object-contain"
          />
        ) : (
          <span className="bg-muted inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
            {initials}
          </span>
        )}
        <span>{displayName}</span>
      </div>
    );
  };

  return (
    <Dialog open={cellId !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[95vh] max-w-[95vw] flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isQueryCell
                ? 'Query Cell'
                : isTextCell
                  ? 'Text Cell'
                  : 'Prompt Cell'}
            </DialogTitle>
            {renderDatasourceDisplay()}
          </div>
        </DialogHeader>
        <div className="flex flex-1 flex-col gap-4 overflow-auto">
          {/* Editor */}
          <div
            ref={codeMirrorContainerRef}
            className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 max-h-[50vh] min-h-[200px] flex-1 overflow-auto rounded-none border [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
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
                className="h-full [&_.cm-content]:px-4 [&_.cm-content]:py-2 [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-editor]:rounded-none [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm"
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
              <div className="h-[60vh] min-h-[400px] p-4">
                <DataGrid
                  columns={result.columns?.map((col) => col.name) ?? []}
                  rows={result.rows ?? []}
                  pageSize={50}
                />
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
          className={`h-7 w-7 transition-all duration-300 ease-in-out ${isHovering ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
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
  onSave,
  cellResults: externalCellResults,
  cellErrors: externalCellErrors,
  cellLoadingStates: externalCellLoadingStates,
  onDeleteNotebook,
  isDeletingNotebook,
  workspaceMode,
  hasUnsavedChanges = false,
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
        title: cell.title,
      }));
    }
    if (initialCells) {
      return initialCells;
    }
    // Default: empty array
    return [];
  });

  const [fullViewCellId, setFullViewCellId] = useState<number | null>(null);

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

  const isAdvancedMode =
    workspaceMode !== undefined
      ? workspaceMode === WorkspaceModeEnum.ADVANCED
      : true;

  // Track last synced cells to prevent unnecessary resets
  const lastSyncedCellsRef = useRef<string>('');

  // Sync with notebook prop if provided, but only when cells actually change
  React.useEffect(() => {
    if (notebook?.cells) {
      // Create a stable string representation of cells for comparison
      const cellsKey = JSON.stringify(
        notebook.cells.map((cell) => ({
          query: cell.query,
          cellId: cell.cellId,
          cellType: cell.cellType,
          datasources: cell.datasources,
          isActive: cell.isActive,
          runMode: cell.runMode,
          title: cell.title,
        })),
      );

      // Only sync if cells actually changed
      if (cellsKey !== lastSyncedCellsRef.current) {
        lastSyncedCellsRef.current = cellsKey;
        setCells(
          notebook.cells.map((cell: Notebook['cells'][number]) => ({
            query: cell.query,
            cellId: cell.cellId,
            cellType: cell.cellType,
            datasources: cell.datasources,
            isActive: cell.isActive,
            runMode: cell.runMode,
            title: cell.title,
          })),
        );
      }
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

  const handleAddCell = (
    afterCellId?: number,
    cellType: CellType = 'query',
  ) => {
    const maxCellId =
      cells.length > 0
        ? Math.max(...cells.map((c: NotebookCellData) => c.cellId), 0)
        : 0;
    const cellNumber = cells.length + 1;
    const newCell: NotebookCellData = {
      query:
        cellType === 'query'
          ? '\n'.repeat(9) // 10 lines total (9 newlines + 1 empty line)
          : cellType === 'text'
            ? '# Markdown Cell\n\nWrite your markdown content here...\n'
            : '', // Prompt cells start empty
      cellId: maxCellId + 1,
      cellType,
      datasources: [],
      isActive: true,
      runMode: 'default',
      title: `Cell ${cellNumber}`,
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
    } else {
      const newCells = [...cells, newCell];
      setCells(newCells);
      onCellsChange?.(newCells);
    }
  };

  const handleQueryChange = useCallback(
    (cellId: number, query: string) => {
      setCells((prev) => {
        const newCells = prev.map((cell) =>
          cell.cellId === cellId ? { ...cell, query } : cell,
        );
        onCellsChange?.(newCells);
        return newCells;
      });
    },
    [onCellsChange],
  );

  const handleTitleChange = useCallback(
    (cellId: number, title: string) => {
      setCells((prev) => {
        const newCells = prev.map((cell) =>
          cell.cellId === cellId ? { ...cell, title: title || undefined } : cell,
        );
        onCellsChange?.(newCells);
        return newCells;
      });
    },
    [onCellsChange],
  );

  const handleDatasourceChange = useCallback(
    (cellId: number, datasourceId: string | null) => {
      setCells((prev) => {
        const newCells = prev.map((cell) =>
          cell.cellId === cellId
            ? { ...cell, datasources: datasourceId ? [datasourceId] : [] }
            : cell,
        );
        onCellsChange?.(newCells);
        return newCells;
      });
    },
    [onCellsChange],
  );

  const handleRunQuery = useCallback(
    (cellId: number, query: string, datasourceId: string) => {
      onRunQuery?.(cellId, query, datasourceId);
    },
    [onRunQuery],
  );

  const handleRunQueryWithAgent = useCallback(
    (
      cellId: number,
      query: string,
      datasourceId: string,
      _cellType?: 'query' | 'prompt',
    ) => {
      onRunQueryWithAgent?.(cellId, query, datasourceId);
    },
    [onRunQueryWithAgent],
  );

  const handleMoveCellUp = useCallback(
    (cellId: number) => {
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
    },
    [onCellsChange],
  );

  const handleMoveCellDown = useCallback(
    (cellId: number) => {
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
    },
    [onCellsChange],
  );

  const handleDuplicateCell = useCallback(
    (cellId: number) => {
      setCells((prev) => {
        const cell = prev.find((c) => c.cellId === cellId);
        if (!cell) return prev;

        const maxCellId = Math.max(...prev.map((c) => c.cellId), 0);
        const cellNumber = prev.length + 1;
        const newCell: NotebookCellData = {
          ...cell,
          cellId: maxCellId + 1,
          title: cell.title ? `${cell.title} (copy)` : `Cell ${cellNumber}`,
        };

        const index = prev.findIndex((c) => c.cellId === cellId);
        const newCells = [
          ...prev.slice(0, index + 1),
          newCell,
          ...prev.slice(index + 1),
        ];
        onCellsChange?.(newCells);
        return newCells;
      });
    },
    [onCellsChange],
  );

  const handleFormatCell = useCallback(
    (cellId: number) => {
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
    },
    [onCellsChange],
  );

  const handleDeleteCell = useCallback(
    (cellId: number) => {
      setTimeout(() => {
        setCells((prev) => {
          const newCells = prev.filter((c) => c.cellId !== cellId);
          onCellsChange?.(newCells);
          return newCells;
        });
      }, 200);
    },
    [onCellsChange],
  );

  const handleFullView = useCallback((cellId: number) => {
    setFullViewCellId(cellId);
  }, []);

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
      setTimeout(() => {
        titleInputRef.current?.focus();
        titleInputRef.current?.select();
      }, 0);
    }
  }, [isEditingTitle]);

  const handleTitleSave = React.useCallback(() => {
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
  }, [titleValue, displayTitle, onNotebookChange]);

  const handleTitleBlur = React.useCallback(() => {
    // Only save on blur if we're still in edit mode (not cancelled)
    if (isEditingTitle) {
      handleTitleSave();
    }
  }, [isEditingTitle, handleTitleSave]);

  const handleTitleCancel = React.useCallback(() => {
    setTitleValue(displayTitle);
    setIsEditingTitle(false);
  }, [displayTitle]);

  const handleTitleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  }, [handleTitleSave, handleTitleCancel]);

  const allDatasources = useMemo((): NotebookDatasourceInfo[] => {
    const notebookDatasourceIds = notebook?.datasources || [];

    if (datasources.length > 0) {
      const allIds = new Set([
        ...notebookDatasourceIds,
        ...datasources.map((ds) => ds.id),
      ]);
      return Array.from(allIds).map((id) => {
        const found = datasources.find((ds) => ds.id === id);
        return (
          found || {
            id,
            name: id,
          }
        );
      });
    }

    return notebookDatasourceIds.map((id: string) => ({
      id,
      name: id,
    }));
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
            <div className="flex flex-1 items-center gap-2">
              {isEditingTitle ? (
                <>
                  <Input
                    ref={titleInputRef}
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="h-auto flex-1 border-0 bg-transparent px-0 py-0 text-2xl font-semibold focus-visible:ring-0 shadow-none"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={handleTitleCancel}
                    aria-label="Discard changes"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-semibold">{headerTitle}</h1>
                  {hasUnsavedChanges && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-[#ffcb51]/50 bg-[#ffcb51] shadow-sm"
                      aria-label="Unsaved changes"
                      title="Unsaved changes"
                    />
                  )}
                  {onSave && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-7 w-7 shrink-0 transition-all duration-300 ease-in-out ${isHoveringTitle ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSave();
                      }}
                      aria-label="Save notebook"
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-7 w-7 shrink-0 transition-all duration-300 ease-in-out ${isHoveringTitle ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}
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
                </>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
          </div>
        </div>
      )}

      {/* Cells container */}
      <div className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 min-h-0 flex-1 overflow-x-hidden overflow-y-auto pl-16 pr-12 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext
            items={cells.map((c) => c.cellId.toString())}
            strategy={verticalListSortingStrategy}
          >
            <div className="flex flex-col gap-4 pt-6">
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
                      onQueryChange={handleQueryChange}
                      onTitleChange={handleTitleChange}
                      onDatasourceChange={handleDatasourceChange}
                      onRunQuery={handleRunQuery}
                      onRunQueryWithAgent={handleRunQueryWithAgent}
                      datasources={allDatasources}
                      result={cellResults.get(cell.cellId)}
                      error={undefined}
                      isLoading={isLoading}
                      onMoveUp={handleMoveCellUp}
                      onMoveDown={handleMoveCellDown}
                      onDuplicate={handleDuplicateCell}
                      onFormat={handleFormatCell}
                      onDelete={handleDeleteCell}
                      onFullView={handleFullView}
                      isAdvancedMode={isAdvancedMode}
                      activeAiPopup={activeAiPopup}
                      onOpenAiPopup={handleOpenAiPopup}
                      onCloseAiPopup={handleCloseAiPopup}
                    />
                    {/* Error Display - Between cells */}
                    {cell.cellType === 'query' && cellError && (
                      <div className="py-2">
                        <Alert variant="destructive" className="m-4">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="font-mono text-sm">
                            {cellError}
                          </AlertDescription>
                        </Alert>
                      </div>
                    )}
                    {index < cells.length - 1 && (
                      <CellDivider
                        onAddCell={(type) => handleAddCell(cell.cellId, type)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {/* Add cell button at the bottom */}
              <div className="flex flex-col items-center gap-4 py-8">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-border hover:bg-accent/50 group flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-dashed transition-all"
                    >
                      <Plus className="text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors" />
                      <span className="text-muted-foreground group-hover:text-foreground text-sm font-medium transition-colors">
                        Add a cell
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-48">
                    <DropdownMenuItem
                      onClick={() => handleAddCell(undefined, 'query')}
                    >
                      <Type className="mr-2 h-4 w-4" />
                      <span>Code Cell</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAddCell(undefined, 'text')}
                    >
                      <BookText className="mr-2 h-4 w-4" />
                      <span>Markdown Cell</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleAddCell(undefined, 'prompt')}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      <span>Prompt Cell</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
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
