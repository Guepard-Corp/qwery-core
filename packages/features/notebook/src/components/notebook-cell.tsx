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
import { DataGrid } from '@qwery/ui/ai';
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
  onQueryChange: (query: string) => void;
  onDatasourceChange: (datasourceId: string | null) => void;
  onRunQuery?: (query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (
    query: string,
    datasourceId: string,
    cellType?: 'query' | 'prompt',
  ) => void;
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
  onDuplicate: _onDuplicate,
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
  const isScrollingRef = useRef(false);

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
    onRunQueryWithAgent(
      query,
      selectedDatasource,
      cell.cellType === 'query' || cell.cellType === 'prompt'
        ? cell.cellType
        : undefined,
    );
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
          <span className="bg-muted inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
            {initials}
          </span>
        )}
        <span className="truncate text-[11px]">{displayName}</span>
      </div>
    );
  }, []);

  const isDarkMode = resolvedTheme === 'dark';

  const handleAISubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuestion.trim() || !onRunQueryWithAgent || !selectedDatasource)
      return;

    onRunQueryWithAgent(
      aiQuestion,
      selectedDatasource,
      cell.cellType === 'query' || cell.cellType === 'prompt'
        ? cell.cellType
        : undefined,
    );

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
    if (!container) {
      return;
    }

    const resizeObserver = new ResizeObserver(checkContentTruncation);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [checkContentTruncation]);

  return (
    <div
      ref={cellContainerRef}
      data-cell-id={cell.cellId}
      className={cn(
        'group relative flex w-full min-w-0 flex-col rounded-xl border transition-all duration-200',
        isDragging && 'opacity-50',
        // Cell type specific styling
        isTextCell &&
          'border-transparent bg-transparent shadow-none hover:border-transparent',
        isPromptCell &&
          'border-border/60 bg-muted/20 hover:border-border/70 border-2 border-dashed',
        isQueryCell &&
          'border-black/20 shadow-sm hover:border-black/30 hover:shadow-md dark:border-white/30 dark:hover:border-white/40',
        !isTextCell &&
          !isPromptCell &&
          !isQueryCell &&
          'hover:border-border/80 hover:shadow-sm',
      )}
    >
      {/* Absolute Drag handle - visible only on hover */}
      <button
        type="button"
        className="text-muted-foreground/30 hover:text-foreground absolute top-4 -left-8 cursor-grab border-0 bg-transparent p-0 opacity-0 transition-all duration-200 group-hover:opacity-100 active:cursor-grabbing"
        ref={dragHandleRef}
        {...dragHandleProps}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      {/* Cell content */}
      <div
        className={cn(
          'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl',
          isTextCell ? 'min-h-[180px] bg-transparent' : 'bg-background',
          isQueryCell && 'min-h-[220px]',
          isPromptCell && 'min-h-[200px]',
        )}
      >
        {/* Editor Area */}
        <div
          ref={editorContainerRef}
          className="[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 relative max-h-[600px] min-h-[40px] flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
        >
          {isQueryCell ? (
            // SQL Query Editor with CodeMirror
            <div ref={codeMirrorRef} className="relative flex h-full">
              <Button
                size="sm"
                onClick={handleRunQuery}
                disabled={!query.trim() || isLoading || !selectedDatasource}
                className="absolute top-3 right-3 z-10 h-7 gap-1.5 bg-[#ffcb51] px-2 text-xs font-semibold text-black shadow-sm transition-all hover:bg-[#ffcb51]/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <PlayIcon className="h-3.5 w-3.5 fill-current" />
                    <span>Run</span>
                  </>
                )}
              </Button>
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
                className="[&_.cm-scroller::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_.cm-scroller::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 flex-1 [&_.cm-content]:px-4 [&_.cm-content]:py-4 [&_.cm-content]:pr-12 [&_.cm-editor]:h-full [&_.cm-editor]:bg-transparent [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm [&_.cm-scroller::-webkit-scrollbar]:w-2 [&_.cm-scroller::-webkit-scrollbar-thumb]:rounded-full [&_.cm-scroller::-webkit-scrollbar-track]:bg-transparent"
                data-test="notebook-sql-editor"
                placeholder={
                  showAIPopup
                    ? undefined
                    : isAdvancedMode
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
                cellType={
                  cell.cellType === 'query' || cell.cellType === 'prompt'
                    ? cell.cellType
                    : undefined
                }
                isLoading={isLoading}
                enableShortcut={isAdvancedMode}
              />
            </div>
          ) : isTextCell ? (
            <div className="relative flex h-full flex-col">
              {markdownView === 'edit' ? (
                <div className="flex min-h-0 flex-1 flex-col">
                  {/* Preview on top when editing */}
                  <div
                    ref={markdownPreviewRef}
                    className="border-border bg-muted/30 markdown-preview-scroll min-h-0 flex-1 flex-shrink-0 overflow-auto border-b px-4 py-4 pr-12"
                    onScroll={(e) => {
                      if (isScrollingRef.current) return;
                      const editor = textareaRef.current;
                      if (editor) {
                        isScrollingRef.current = true;
                        const previewScrollRatio =
                          e.currentTarget.scrollTop /
                          Math.max(
                            1,
                            e.currentTarget.scrollHeight -
                              e.currentTarget.clientHeight,
                          );
                        editor.scrollTop =
                          previewScrollRatio *
                          Math.max(
                            1,
                            editor.scrollHeight - editor.clientHeight,
                          );
                        requestAnimationFrame(() => {
                          isScrollingRef.current = false;
                        });
                      }
                    }}
                  >
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {query.trim().length > 0 ? (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={notebookMarkdownComponents}
                        >
                          {query}
                        </ReactMarkdown>
                      ) : null}
                    </div>
                  </div>
                  {/* Editor below - fills remaining space */}
                  <div className="bg-muted/5 min-h-0 flex-1 flex-shrink-0 overflow-hidden">
                    <Textarea
                      ref={textareaRef}
                      value={query}
                      onChange={(e) => handleQueryChange(e.target.value)}
                      disabled={isLoading}
                      className="markdown-editor-scroll h-full w-full resize-none overflow-y-auto border-0 bg-transparent px-4 py-4 pr-12 text-sm leading-6 focus-visible:ring-0"
                      onScroll={(e) => {
                        if (isScrollingRef.current) return;
                        const preview = markdownPreviewRef.current;
                        if (preview) {
                          isScrollingRef.current = true;
                          const editorScrollRatio =
                            e.currentTarget.scrollTop /
                            Math.max(
                              1,
                              e.currentTarget.scrollHeight -
                                e.currentTarget.clientHeight,
                            );
                          preview.scrollTop =
                            editorScrollRatio *
                            Math.max(
                              1,
                              preview.scrollHeight - preview.clientHeight,
                            );
                          requestAnimationFrame(() => {
                            isScrollingRef.current = false;
                          });
                        }
                      }}
                      onBlur={handleMarkdownBlur}
                      spellCheck
                      placeholder="Write markdown content..."
                      data-test="notebook-md-editor"
                    />
                  </div>
                </div>
              ) : (
                <div
                  className="bg-muted/30 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 flex-1 cursor-pointer overflow-auto px-4 py-4 pr-12 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
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
                    ) : null}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative flex h-full flex-col">
              <Button
                size="sm"
                onClick={handlePromptSubmit}
                disabled={!query.trim() || isLoading}
                className="absolute top-3 right-3 z-10 h-7 gap-1.5 bg-[#ffcb51] px-2 text-xs font-semibold text-black shadow-sm transition-all hover:bg-[#ffcb51]/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Generate</span>
                  </>
                )}
              </Button>
              <div className="bg-muted/10 flex-1 px-4 py-4 pr-12">
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
                    'min-h-[120px] w-full resize-none border-0 bg-transparent text-sm leading-6 focus-visible:ring-0',
                    isPromptCell && 'font-mono',
                  )}
                  placeholder="Describe what you want the AI to generate..."
                />
                {renderPromptError()}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Toolbar - As seen in screenshot */}
        <div
          className={cn(
            'border-border bg-background flex items-center justify-between border-t px-2 pt-2 pb-2 transition-all duration-200',
            isTextCell &&
              markdownView === 'preview' &&
              'h-0 overflow-hidden opacity-0 group-hover:h-10 group-hover:opacity-100',
            !isTextCell || markdownView === 'edit' ? 'h-10' : '',
          )}
        >
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              onClick={onFormat}
              aria-label="Format cell"
            >
              <AlignLeft className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-foreground h-8 w-8"
              onClick={() => {
                navigator.clipboard.writeText(query);
              }}
              aria-label="Copy code"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive h-8 w-8"
              onClick={onDelete}
              aria-label="Delete cell"
            >
              <Trash2 className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-muted-foreground h-8 w-8"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={onMoveUp}>
                  <ArrowUp className="mr-2 h-4 w-4" />
                  Move up
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onMoveDown}>
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Move down
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onFullView}>
                  <Maximize2 className="mr-2 h-4 w-4" />
                  Full view
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            {(isQueryCell || isPromptCell) && (
              <Select
                value={selectedDatasource ?? undefined}
                onValueChange={(value) => onDatasourceChange(value)}
                disabled={datasources.length === 0}
              >
                <SelectTrigger className="hover:bg-accent text-muted-foreground h-7 w-auto min-w-[120px] border-none bg-transparent text-[11px] font-medium shadow-none">
                  <DatabaseIcon className="mr-1.5 h-3 w-3" />
                  <SelectValue placeholder="Select datasource" />
                </SelectTrigger>
                <SelectContent>
                  {datasources.map((ds) => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {renderDatasourceOption(ds)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Results Grid */}
        {isQueryCell && result && (
          <div className="border-border max-h-[400px] border-t p-0">
            <DataGrid
              columns={result.columns?.map((col) => col.name) ?? []}
              rows={result.rows ?? []}
              pageSize={50}
            />
          </div>
        )}

        {/* Error Display */}
        {isQueryCell && typeof error === 'string' && error.length > 0 && (
          <div className="border-border border-t">
            <Alert
              variant="destructive"
              className="bg-destructive/10 m-2 rounded-lg border-none"
            >
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="font-mono text-xs">
                {error}
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </div>
  );
}

NotebookCellComponent.displayName = 'NotebookCell';

export const NotebookCell = memo(NotebookCellComponent);
