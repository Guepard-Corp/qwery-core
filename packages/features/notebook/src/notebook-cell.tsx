'use client';

import * as React from 'react';

import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  DatabaseIcon,
  GripVertical,
  Maximize2,
  MoreVertical,
  PlayIcon,
  Trash2,
} from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

import type { CellType, DatasourceResultSet } from '@qwery/domain/entities';
import { Alert, AlertDescription } from '@qwery/ui/alert';
import { Button } from '@qwery/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { Textarea } from '@qwery/ui/textarea';
import { cn } from '@qwery/ui/utils';

import { NotebookDataGrid } from './notebook-datagrid';

export interface NotebookCellData {
  query?: string;
  cellId: number;
  cellType: CellType;
  datasources: string[];
  isActive: boolean;
  runMode: 'default' | 'fixit';
}

interface NotebookCellProps {
  cell: NotebookCellData;
  datasources: Array<{ id: string; name: string }>;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onQueryChange: (query: string) => void;
  onDatasourceChange: (datasourceId: string) => void;
  onRunQuery?: (query: string, datasourceId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  isDragging?: boolean;
  result?: DatasourceResultSet | null;
  error?: string;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onFormat: () => void;
  onDelete: () => void;
  onFullView: () => void;
}

export function NotebookCell({
  cell,
  datasources,
  isCollapsed,
  onToggleCollapse,
  onQueryChange,
  onDatasourceChange,
  onRunQuery,
  dragHandleProps,
  isDragging,
  result,
  error,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onFormat,
  onDelete,
  onFullView,
}: NotebookCellProps) {
  const { resolvedTheme } = useTheme();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const query = cell.query ?? '';

  // Determine selected datasource - prefer cell's datasource, fallback to first available
  const selectedDatasource = React.useMemo(() => {
    // First, try to use the cell's datasource if it exists and is in the available datasources
    if (
      cell.datasources &&
      cell.datasources.length > 0 &&
      datasources &&
      datasources.length > 0
    ) {
      const cellDatasourceId = cell.datasources[0];
      const found = datasources.find((ds) => ds.id === cellDatasourceId);
      if (found) {
        return cellDatasourceId;
      }
    }

    // Fallback to first available datasource
    if (datasources && datasources.length > 0 && datasources[0]) {
      return datasources[0].id;
    }

    return undefined;
  }, [cell.datasources, datasources]);

  const handleQueryChange = (value: string) => {
    onQueryChange(value);
  };

  const handleRunQuery = () => {
    if (
      onRunQuery &&
      query &&
      cell.cellType === 'query' &&
      selectedDatasource
    ) {
      onRunQuery(query, selectedDatasource);
    }
  };

  const isQueryCell = cell.cellType === 'query';
  const isTextCell = cell.cellType === 'text';
  const isPromptCell = cell.cellType === 'prompt';
  const isDarkMode = resolvedTheme === 'dark';

  return (
    <div
      className={cn(
        'group border-border relative flex w-full border-b',
        isDragging && 'opacity-50',
      )}
    >
      {/* Left controls: Drag handle + Collapse button */}
      <div className="border-border bg-muted/20 flex w-10 shrink-0 items-start border-r pt-2">
        <div className="flex w-full flex-col items-center gap-1">
          <button
            {...dragHandleProps}
            className={cn(
              'text-muted-foreground hover:text-foreground flex h-6 w-full items-center justify-center transition-colors',
              'cursor-grab active:cursor-grabbing',
            )}
            type="button"
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onToggleCollapse}
            aria-label={isCollapsed ? 'Expand cell' : 'Collapse cell'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Cell content */}
      {!isCollapsed && (
        <div className="bg-background flex min-h-[120px] flex-1 flex-col overflow-hidden">
          {/* Toolbar - Show for all cells */}
          <div className="border-border bg-background flex h-10 items-center justify-between border-b px-3">
            {/* Left: Play button with dropdown (only for query cells) */}
            {isQueryCell && (
              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleRunQuery}
                  disabled={!query.trim()}
                >
                  <PlayIcon className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem>Run current cell</DropdownMenuItem>
                    <DropdownMenuItem>Run all cells</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Right: Full view button, Database selector (query cells only), and More menu */}
            <div className="ml-auto flex items-center gap-2">
              {isQueryCell && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={onFullView}
                    aria-label="Full view"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                  <DatabaseIcon className="text-muted-foreground h-4 w-4" />
                  <Select
                    value={selectedDatasource}
                    onValueChange={onDatasourceChange}
                  >
                    <SelectTrigger className="border-border bg-background hover:bg-accent h-7 w-auto min-w-[140px] border shadow-sm">
                      <SelectValue
                        placeholder={
                          datasources && datasources.length > 0
                            ? 'Select datasource'
                            : 'No datasources'
                        }
                      />
                    </SelectTrigger>
                    {datasources && datasources.length > 0 ? (
                      <SelectContent>
                        {datasources.map((ds) => (
                          <SelectItem key={ds.id} value={ds.id}>
                            {ds.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    ) : (
                      <SelectContent>
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          No datasources available
                        </div>
                      </SelectContent>
                    )}
                  </Select>
                </>
              )}
              {!isQueryCell && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={onFullView}
                  aria-label="Full view"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    aria-label="More options"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onMoveUp}>
                    <ArrowUp className="mr-2 h-4 w-4" />
                    Move cell up
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onMoveDown}>
                    <ArrowDown className="mr-2 h-4 w-4" />
                    Move cell down
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate cell
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onFormat}>
                    <AlignLeft className="mr-2 h-4 w-4" />
                    Format cell
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editor */}
          <div className="relative flex-1 overflow-hidden">
            {isQueryCell ? (
              // SQL Query Editor with CodeMirror
              <div className="flex h-full">
                <CodeMirror
                  value={query}
                  onChange={(value) => handleQueryChange(value)}
                  extensions={[sql()]}
                  theme={isDarkMode ? oneDark : undefined}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                  }}
                  className="flex-1 [&_.cm-content]:px-4 [&_.cm-content]:py-2 [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm"
                  placeholder="-- Enter your SQL query here..."
                />
              </div>
            ) : (
              // Text/Prompt Editor without line numbers
              <div className="flex-1 overflow-auto">
                <Textarea
                  ref={textareaRef}
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className={cn(
                    'min-h-[120px] w-full resize-none rounded-none border-0 text-sm',
                    'bg-transparent px-4 py-2 focus-visible:ring-0',
                    'leading-[1.5rem]',
                    isPromptCell && 'font-mono',
                  )}
                  spellCheck={isTextCell}
                  placeholder={
                    isTextCell
                      ? 'Enter text here...'
                      : isPromptCell
                        ? 'Enter your prompt here...'
                        : 'Enter text here...'
                  }
                />
              </div>
            )}
          </div>

          {/* Results Grid */}
          {isQueryCell && result && !isCollapsed && (
            <div className="border-border h-[400px] min-h-[400px] border-t">
              <NotebookDataGrid result={result} />
            </div>
          )}

          {/* Error Display */}
          {isQueryCell &&
            typeof error === 'string' &&
            error.length > 0 &&
            !isCollapsed && (
              <div className="border-border border-t">
                <Alert variant="destructive" className="m-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="font-mono text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              </div>
            )}
        </div>
      )}

      {/* Collapsed view */}
      {isCollapsed && (
        <div className="border-border bg-background flex h-10 flex-1 items-center border-b px-3">
          {isQueryCell ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={handleRunQuery}
              disabled={!query.trim()}
            >
              <PlayIcon className="h-4 w-4" />
            </Button>
          ) : (
            <span className="text-muted-foreground truncate text-sm">
              {query.trim() || (isTextCell ? 'Text cell' : 'Prompt cell')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
