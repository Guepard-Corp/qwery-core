'use client';

import * as React from 'react';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';

import { sql } from '@codemirror/lang-sql';
import { oneDark } from '@codemirror/theme-one-dark';
import CodeMirror from '@uiw/react-codemirror';
import { EditorView } from '@codemirror/view';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Copy,
  DatabaseIcon,
  GripVertical,
  Loader2,
  Maximize2,
  MoreVertical,
  PlayIcon,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { useTheme } from 'next-themes';

import type { CellType } from '@qwery/domain/enums';
import type { DatasourceResultSet } from '@qwery/domain/entities';
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

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { NotebookCellAiPopup } from './notebook-cell-ai-popup';
import { NotebookDataGrid } from './notebook-datagrid';
import { notebookMarkdownComponents } from './notebook-markdown-components';

export interface NotebookCellData {
  query?: string;
  cellId: number;
  cellType: CellType;
  datasources: string[];
  isActive: boolean;
  runMode: 'default' | 'fixit';
}

export interface NotebookDatasourceInfo {
  id: string;
  name: string;
  provider?: string;
  logo?: string;
}

interface NotebookCellProps {
  cell: NotebookCellData;
  datasources: NotebookDatasourceInfo[];
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onQueryChange: (query: string) => void;
  onDatasourceChange: (datasourceId: string | null) => void;
  onRunQuery?: (query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (query: string, datasourceId: string) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: (node: HTMLButtonElement | null) => void;
  isDragging?: boolean;
  result?: DatasourceResultSet | null;
  error?: string;
  isLoading?: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDuplicate: () => void;
  onFormat: () => void;
  onDelete: () => void;
  onFullView: () => void;
  activeAiPopup: { cellId: number; position: { x: number; y: number } } | null;
  onOpenAiPopup: (cellId: number, position: { x: number; y: number }) => void;
  onCloseAiPopup: () => void;
  isAdvancedMode?: boolean;
}

function NotebookCellComponent({
  cell,
  datasources,
  isCollapsed,
  onToggleCollapse,
  onQueryChange,
  onDatasourceChange,
  onRunQuery,
  onRunQueryWithAgent,
  dragHandleProps,
  dragHandleRef,
  isDragging,
  result,
  error,
  isLoading = false,
  onMoveUp,
  onMoveDown,
  onDuplicate,
  onFormat,
  onDelete,
  onFullView,
  activeAiPopup,
  onOpenAiPopup,
  onCloseAiPopup,
  isAdvancedMode = true,
}: NotebookCellProps) {
  const { resolvedTheme } = useTheme();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeMirrorRef = useRef<HTMLDivElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const cellContainerRef = useRef<HTMLDivElement>(null);
  const [aiQuestion, setAiQuestion] = useState('');
  const aiInputRef = useRef<HTMLTextAreaElement>(null);
  const persistedQuery = cell.query ?? '';
  const [localQuery, setLocalQuery] = useState(persistedQuery);
  const [, startTransition] = useTransition();
  const query = localQuery;
  const isQueryCell = cell.cellType === 'query';
  const isTextCell = cell.cellType === 'text';
  const isPromptCell = cell.cellType === 'prompt';
  const [markdownView, setMarkdownView] = useState<'edit' | 'preview'>(
    'preview',
  );
  const markdownPreviewRef = useRef<HTMLDivElement>(null);
  const [markdownPreviewHeight, setMarkdownPreviewHeight] =
    useState<number>(160);
  const showAIPopup = activeAiPopup?.cellId === cell.cellId;
  const [promptDatasourceError, setPromptDatasourceError] = useState(false);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      setMarkdownView(isTextCell ? 'preview' : 'edit');
    }, 0);
  }, [cell.cellId, isTextCell]);

  // Handle Ctrl+K keyboard shortcut to open AI popup
  useEffect(() => {
    if (!isQueryCell || !isAdvancedMode) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes('MAC');
      const isModKeyPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!isModKeyPressed || event.key !== 'k') return;

      const container = cellContainerRef.current;
      const target = event.target as HTMLElement | null;
      if (!container || !target || !container.contains(target)) return;

      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.cm-editor') !== null;

      if (!isInputFocused) return;

      event.preventDefault();
      if (showAIPopup) {
        onCloseAiPopup();
      } else {
        onOpenAiPopup(cell.cellId, { x: 0, y: 0 });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cell.cellId,
    cellContainerRef,
    isAdvancedMode,
    isQueryCell,
    onCloseAiPopup,
    onOpenAiPopup,
    showAIPopup,
  ]);

  const handleMarkdownDoubleClick = () => {
    if (isTextCell) {
      if (markdownPreviewRef.current) {
        setMarkdownPreviewHeight(markdownPreviewRef.current.offsetHeight);
      }
      setMarkdownView('edit');
      requestAnimationFrame(() => {
        const textarea = textareaRef.current;
        if (textarea) {
          textarea.focus();
          textarea.style.height = 'auto';
          textarea.style.height = `${Math.max(
            markdownPreviewHeight,
            textarea.scrollHeight,
          )}px`;
        }
      });
    }
  };

  useEffect(() => {
    if (isTextCell && markdownView === 'edit') {
      const timer = setTimeout(() => textareaRef.current?.focus(), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isTextCell, markdownView]);

  useEffect(() => {
    if (
      isTextCell &&
      markdownView === 'preview' &&
      markdownPreviewRef.current
    ) {
      setMarkdownPreviewHeight(markdownPreviewRef.current.offsetHeight);
    }
  }, [isTextCell, markdownView, query]);

  const handleMarkdownBlur = () => {
    if (!isTextCell) return;
    setMarkdownView('preview');
  };

  const selectedDatasource = useMemo<string | null>(() => {
    if (!cell.datasources || cell.datasources.length === 0) {
      return null;
    }

    const primaryId = cell.datasources[0];
    if (!primaryId) {
      return null;
    }
    const exists = datasources.some((ds) => ds.id === primaryId);
    return exists ? primaryId : null;
  }, [cell.datasources, datasources]);

  useEffect(() => {
    if (selectedDatasource && promptDatasourceError) {
      setTimeout(() => setPromptDatasourceError(false), 0);
    }
  }, [promptDatasourceError, selectedDatasource]);

  useEffect(() => {
    setTimeout(() => {
      setLocalQuery(persistedQuery);
    }, 0);
  }, [persistedQuery, cell.cellId]);

  const handleQueryChange = useCallback(
    (value: string) => {
      setLocalQuery(value);
      startTransition(() => {
        onQueryChange(value);
      });
    },
    [onQueryChange, startTransition],
  );

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

  const handlePromptSubmit = () => {
    if (!onRunQueryWithAgent || !query.trim() || isLoading) {
      return;
    }
    if (!selectedDatasource) {
      setPromptDatasourceError(true);
      return;
    }
    setPromptDatasourceError(false);
    onRunQueryWithAgent(query, selectedDatasource);
  };

  const renderPromptError = useCallback(() => {
    if (!isPromptCell) return null;

    const hasServerError = typeof error === 'string' && error.trim().length > 0;
    if (!promptDatasourceError && !hasServerError) {
      return null;
    }

    const message = hasServerError
      ? (error ?? 'Prompt failed to execute.')
      : 'Select a datasource before sending prompts to the AI agent.';

    return (
      <div className="px-4">
        <Alert
          variant="destructive"
          className="border-destructive/40 bg-destructive/10 mt-3 mb-4 flex items-start gap-2 rounded-lg"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <AlertDescription className="line-clamp-2 text-sm break-words whitespace-pre-wrap">
            {message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }, [error, isPromptCell, promptDatasourceError]);

  const renderDatasourceOption = useCallback((ds: NotebookDatasourceInfo) => {
    const displayName = ds.name && ds.name.length > 0 ? ds.name : ds.id;
    const providerLabel = ds.provider
      ? ds.provider.replace(/[_-]/g, ' ').toUpperCase()
      : 'CUSTOM';
    const initials = displayName.slice(0, 2).toUpperCase();

    return (
      <div className="flex min-w-0 items-center gap-2">
        {ds.logo ? (
          <img
            src={ds.logo}
            alt={`${displayName} logo`}
            className="h-4 w-4 flex-shrink-0 rounded object-contain"
          />
        ) : (
          <span className="bg-muted inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
            {initials}
          </span>
        )}
        <div className="flex min-w-0 items-center justify-between gap-3 text-sm leading-tight">
          <span className="truncate">{displayName}</span>
          <span className="text-muted-foreground flex-shrink-0 text-[11px] uppercase">
            {providerLabel}
          </span>
        </div>
      </div>
    );
  }, []);

  const isDarkMode = resolvedTheme === 'dark';

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !onRunQueryWithAgent || !selectedDatasource)
      return;

    onRunQueryWithAgent(query, selectedDatasource);

    // Close popup and reset
    onCloseAiPopup();
    setAiQuestion('');
  };

  const checkContentTruncation = useCallback(() => {
    // Removed unused state update
  }, []);

  useEffect(() => {
    checkContentTruncation();
  }, [query, checkContentTruncation]);

  useEffect(() => {
    const container = editorContainerRef.current;
    if (!container || isCollapsed) {
      return;
    }

    const resizeObserver = new ResizeObserver(checkContentTruncation);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkContentTruncation, isCollapsed]);

  return (
    <div
      ref={cellContainerRef}
      className={cn(
        'group border-border relative flex w-full min-w-0 border-b',
        isDragging && 'opacity-50',
      )}
    >
      {/* Left controls: Drag handle + Collapse button */}
      <div className="border-border bg-muted/20 flex w-10 shrink-0 items-start border-r pt-2">
        <div className="flex w-full flex-col items-center gap-1">
          <button
            ref={dragHandleRef}
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
          {!isTextCell && (
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
          )}
        </div>
      </div>

      {/* Cell content */}
      {!isCollapsed && (
        <div className="bg-background relative flex min-h-[280px] min-w-0 flex-1 flex-col overflow-hidden">
          {/* Toolbar - Show for all cells */}
          <div className="border-border bg-background flex h-10 items-center justify-between border-b px-3">
            <div className="flex items-center gap-2">
              {isQueryCell && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={handleRunQuery}
                  disabled={!query.trim() || isLoading || !selectedDatasource}
                  aria-label="Run query"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <PlayIcon className="h-4 w-4" />
                  )}
                </Button>
              )}
              {isPromptCell && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={handlePromptSubmit}
                    disabled={!query.trim() || isLoading}
                    aria-label="Submit prompt to AI"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                  </Button>
                </>
              )}
              {isTextCell && (
                <div className="text-muted-foreground flex items-center gap-2 text-[11px] tracking-wide uppercase">
                  <span>Markdown</span>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-6 text-[11px]"
                    onClick={() =>
                      setMarkdownView((prev) =>
                        prev === 'preview' ? 'edit' : 'preview',
                      )
                    }
                  >
                    {markdownView === 'preview' ? 'Edit' : 'Preview'}
                  </Button>
                </div>
              )}
            </div>

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
                    value={selectedDatasource ?? undefined}
                    onValueChange={(value) => onDatasourceChange(value)}
                    disabled={datasources.length === 0}
                  >
                    <SelectTrigger className="border-border bg-background hover:bg-accent h-7 w-auto min-w-[140px] border shadow-sm">
                      <SelectValue placeholder="Select datasource" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasources && datasources.length > 0 ? (
                        datasources.map((ds) => (
                          <SelectItem key={ds.id} value={ds.id}>
                            {renderDatasourceOption(ds)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          No datasources available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </>
              )}

              {isPromptCell && (
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
                    value={selectedDatasource ?? undefined}
                    onValueChange={(value) => onDatasourceChange(value)}
                    disabled={datasources.length === 0}
                  >
                    <SelectTrigger className="border-border bg-background hover:bg-accent h-7 w-auto min-w-[140px] border shadow-sm">
                      <SelectValue placeholder="Select datasource" />
                    </SelectTrigger>
                    <SelectContent>
                      {datasources && datasources.length > 0 ? (
                        datasources.map((ds) => (
                          <SelectItem key={ds.id} value={ds.id}>
                            {renderDatasourceOption(ds)}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="text-muted-foreground px-2 py-1.5 text-sm">
                          No datasources available
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </>
              )}

              {!isQueryCell && !isPromptCell && (
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
          <div
            ref={editorContainerRef}
            className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 relative max-h-[400px] min-h-[240px] flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {isQueryCell ? (
              // SQL Query Editor with CodeMirror
              <div ref={codeMirrorRef} className="relative flex h-full">
                <CodeMirror
                  value={query}
                  onChange={(value) => handleQueryChange(value)}
                  extensions={[sql(), EditorView.lineWrapping]}
                  theme={isDarkMode ? oneDark : undefined}
                  editable={!isLoading}
                  basicSetup={{
                    lineNumbers: true,
                    foldGutter: true,
                    dropCursor: false,
                    allowMultipleSelections: false,
                  }}
                  className="[&_.cm-scroller::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_.cm-scroller::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 flex-1 [&_.cm-content]:px-4 [&_.cm-content]:py-2 [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm [&_.cm-scroller::-webkit-scrollbar]:w-2 [&_.cm-scroller::-webkit-scrollbar-thumb]:rounded-full [&_.cm-scroller::-webkit-scrollbar-track]:bg-transparent"
                  data-test="notebook-sql-editor"
                  placeholder={
                    isAdvancedMode
                      ? 'Press Ctrl+K to ask AI'
                      : '-- Enter your SQL query here...'
                  }
                />
                <NotebookCellAiPopup
                  cellId={cell.cellId}
                  isQueryCell={isQueryCell}
                  isOpen={showAIPopup}
                  aiQuestion={aiQuestion}
                  setAiQuestion={setAiQuestion}
                  aiInputRef={aiInputRef}
                  cellContainerRef={cellContainerRef}
                  codeMirrorRef={codeMirrorRef}
                  textareaRef={textareaRef}
                  editorContainerRef={editorContainerRef}
                  onOpenAiPopup={(cellId) =>
                    onOpenAiPopup(cellId, { x: 0, y: 0 })
                  }
                  onCloseAiPopup={onCloseAiPopup}
                  onSubmit={handleAISubmit}
                  query={query}
                  selectedDatasource={selectedDatasource}
                  onRunQueryWithAgent={onRunQueryWithAgent}
                  isLoading={isLoading}
                  enableShortcut={isAdvancedMode}
                />
              </div>
            ) : isTextCell ? (
              <div className="flex h-full flex-col">
                {markdownView === 'edit' ? (
                  <div className="bg-muted/5 flex-1">
                    <Textarea
                      ref={textareaRef}
                      value={query}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      disabled={isLoading}
                      className="h-full w-full resize-none border-0 bg-transparent px-4 py-3 text-sm leading-6 focus-visible:ring-0"
                      style={{ minHeight: markdownPreviewHeight }}
                      onBlur={handleMarkdownBlur}
                      spellCheck
                      placeholder="Write markdown content..."
                      data-test="notebook-md-editor"
                    />
                  </div>
                ) : (
                  <div
                    className="bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 flex-1 overflow-auto px-4 py-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                    onDoubleClick={handleMarkdownDoubleClick}
                    ref={markdownPreviewRef}
                    data-test="notebook-md-preview"
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {query.trim().length > 0 ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={notebookMarkdownComponents}
                        >
                          {query}
                        </ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground">
                          Double-click or use the toolbar to start editing.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full flex-col">
                <div className="bg-muted/5 flex-1 px-4 py-3">
                  <Textarea
                    ref={textareaRef}
                    value={query}
                    onChange={(e) => {
                      handleQueryChange(e.target.value);
                      if (promptDatasourceError) {
                        setPromptDatasourceError(false);
                      }
                    }}
                    disabled={isLoading}
                    className={cn(
                      'min-h-[160px] w-full resize-none border-0 bg-transparent text-sm leading-6 focus-visible:ring-0',
                      isPromptCell && 'font-mono',
                    )}
                    placeholder="Describe what you want the AI to generate..."
                  />
                  {renderPromptError()}
                </div>
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
              className="h-7 w-7 cursor-pointer"
              onClick={handleRunQuery}
              disabled={!query.trim() || isLoading || !selectedDatasource}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PlayIcon className="h-4 w-4" />
              )}
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

NotebookCellComponent.displayName = 'NotebookCell';

export const NotebookCell = memo(NotebookCellComponent);
