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
import { Pencil } from 'lucide-react';

import type { DatasourceResultSet, Notebook } from '@qwery/domain/entities';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';

import { CellDivider } from './cell-divider';
import { NotebookCell, type NotebookCellData } from './notebook-cell';

interface NotebookUIProps {
  notebook?: Notebook;
  initialCells?: NotebookCellData[];
  title?: string;
  datasources?: Array<{ id: string; name: string }>;
  onRunQuery?: (cellId: number, query: string, datasourceId: string) => void;
  onCellsChange?: (cells: NotebookCellData[]) => void;
  onNotebookChange?: (notebook: Partial<Notebook>) => void;
  cellResults?: Map<number, DatasourceResultSet>;
  cellErrors?: Map<number, string>;
}

// Sortable wrapper for cells
function SortableCell({
  cell,
  isCollapsed,
  onToggleCollapse,
  onQueryChange,
  onDatasourceChange,
  onRunQuery,
  datasources,
  result,
  error,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onFormat,
  onDelete,
  onFullView,
}: {
  cell: NotebookCellData;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onQueryChange: (query: string) => void;
  onDatasourceChange: (datasourceId: string) => void;
  onRunQuery?: (query: string, datasourceId: string) => void;
  datasources: Array<{ id: string; name: string }>;
  result?: DatasourceResultSet | null;
  error?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onFormat: () => void;
  onDelete: () => void;
  onFullView: () => void;
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

  return (
    <div ref={setNodeRef} style={style}>
      <NotebookCell
        cell={cell}
        datasources={datasources}
        isCollapsed={isCollapsed}
        onToggleCollapse={onToggleCollapse}
        onQueryChange={onQueryChange}
        onDatasourceChange={onDatasourceChange}
        onRunQuery={onRunQuery}
        dragHandleProps={{ ...attributes, ...listeners }}
        isDragging={isDragging}
        result={result}
        error={error}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
        onDuplicate={onDuplicate}
        onFormat={onFormat}
        onDelete={onDelete}
        onFullView={onFullView}
      />
    </div>
  );
}

export function NotebookUI({
  notebook,
  initialCells,
  title,
  datasources = [],
  onRunQuery,
  onCellsChange,
  onNotebookChange,
  cellResults: externalCellResults,
  cellErrors: externalCellErrors,
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

  const [collapsedCells, setCollapsedCells] = React.useState<Set<number>>(
    new Set(),
  );

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
    } else {
      const newCells = [...cells, newCell];
      setCells(newCells);
      onCellsChange?.(newCells);
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

  const handleDatasourceChange = (cellId: number, datasourceId: string) => {
    setCells((prev) => {
      const newCells = prev.map((cell) =>
        cell.cellId === cellId
          ? { ...cell, datasources: [datasourceId] }
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
    setCells((prev) => {
      const newCells = prev.filter((c) => c.cellId !== cellId);
      onCellsChange?.(newCells);
      return newCells;
    });
  };

  const handleFullView = (cellId: number) => {
    // This can be handled by parent component or state
    // For now, we'll just log it - can be enhanced with a modal/dialog
    console.log('Full view for cell', cellId);
  };

  // Get default title from notebook or prop
  const displayTitle = title || notebook?.title || '';

  // State for editable title
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState(displayTitle);
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
    if (titleValue.trim() && titleValue !== displayTitle) {
      onNotebookChange?.({ title: titleValue.trim() });
    } else if (!titleValue.trim()) {
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
    <div className="bg-background flex h-full flex-col overflow-hidden">
      {/* Title */}
      {displayTitle && (
        <div
          className="border-border border-b px-6 py-4"
          onMouseEnter={() => setIsHoveringTitle(true)}
          onMouseLeave={() => setIsHoveringTitle(false)}
        >
          {isEditingTitle ? (
            <Input
              ref={titleInputRef}
              value={titleValue}
              onChange={(e) => setTitleValue(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={handleTitleKeyDown}
              className="focus-visible:ring-ring h-auto border-0 bg-transparent px-0 py-0 text-2xl font-semibold focus-visible:ring-2"
            />
          ) : (
            <div className="group flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{displayTitle}</h1>
              <Button
                size="icon"
                variant="ghost"
                className={`h-7 w-7 transition-opacity ${isHoveringTitle ? 'opacity-100' : 'opacity-0'}`}
                onClick={() => setIsEditingTitle(true)}
                aria-label="Edit title"
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Cells container */}
      <div className="flex-1 overflow-auto">
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
              {cells.map((cell, index) => {
                // Get error for this specific cell only - ensure strict isolation
                let cellError: string | undefined = undefined;
                if (externalCellErrors && externalCellErrors instanceof Map) {
                  const error = externalCellErrors.get(cell.cellId);
                  if (typeof error === 'string' && error.trim().length > 0) {
                    cellError = error;
                  }
                }

                return (
                  <React.Fragment key={cell.cellId}>
                    <SortableCell
                      cell={cell}
                      isCollapsed={collapsedCells.has(cell.cellId)}
                      onToggleCollapse={() => handleToggleCollapse(cell.cellId)}
                      onQueryChange={(query) =>
                        handleQueryChange(cell.cellId, query)
                      }
                      onDatasourceChange={(datasourceId) =>
                        handleDatasourceChange(cell.cellId, datasourceId)
                      }
                      onRunQuery={(query, datasourceId) => {
                        handleRunQuery(cell.cellId, query, datasourceId);
                      }}
                      datasources={allDatasources}
                      result={cellResults.get(cell.cellId)}
                      error={cellError}
                      onMoveUp={() => handleMoveCellUp(cell.cellId)}
                      onMoveDown={() => handleMoveCellDown(cell.cellId)}
                      onDuplicate={() => handleDuplicateCell(cell.cellId)}
                      onFormat={() => handleFormatCell(cell.cellId)}
                      onDelete={() => handleDeleteCell(cell.cellId)}
                      onFullView={() => handleFullView(cell.cellId)}
                    />
                    {index < cells.length - 1 && (
                      <CellDivider
                        onAddCell={() => handleAddCell(cell.cellId)}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {/* Divider at the end */}
              <CellDivider onAddCell={() => handleAddCell()} />
            </div>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

export default NotebookUI;
