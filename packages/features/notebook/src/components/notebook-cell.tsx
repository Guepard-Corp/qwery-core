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
import { EditorView, placeholder } from '@codemirror/view';
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Check,
  Copy,
  DatabaseIcon,
  FileJson,
  FileText,
  GripVertical,
  Loader2,
  Maximize2,
  MoreVertical,
  Pencil,
  PlayIcon,
  Sparkles,
  Table2,
  Trash2,
  X,
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
import { Input } from '@qwery/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@qwery/ui/tabs';
import { Textarea } from '@qwery/ui/textarea';
import { cn } from '@qwery/ui/utils';
import { ReportRenderer, ResultReportView } from '@qwery/ui/qwery/report';

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
  title?: string;
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
  onTitleChange?: (title: string) => void;
  onDatasourceChange: (datasourceId: string | null) => void;
  onRunQuery?: (query: string, datasourceId: string) => void;
  onRunQueryWithAgent?: (
    query: string,
    datasourceId: string,
    cellType?: 'query' | 'prompt',
  ) => void;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  dragHandleRef?: (node: HTMLButtonElement | null) => void;
  footerDragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  footerDragHandleRef?: (node: HTMLDivElement | null) => void;
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
  totalCellCount?: number;
  triggerTitleEdit?: boolean;
  isNotebookLoading?: boolean;
  /** Pre-rendered report markdown (with vega-lite blocks). When provided, Report tab shows this instead of auto-chart from result. */
  reportContent?: string | null;
}

const ITEMS_PER_PAGE = 10;

function DatasourceSelectWithPagination({
  value,
  onValueChange,
  datasources,
  renderDatasourceOption,
  disabled,
}: {
  value?: string;
  onValueChange: (value: string) => void;
  datasources: NotebookDatasourceInfo[];
  renderDatasourceOption: (ds: NotebookDatasourceInfo) => React.ReactNode;
  disabled?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedDatasource = datasources.find((ds) => ds.id === value);

  const totalPages = Math.ceil(datasources.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDatasources = datasources.slice(startIndex, endIndex);

  // Reset scroll position to top when page changes and prevent popup repositioning
  useEffect(() => {
    if (scrollContainerRef.current) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
      });
    }
  }, [currentPage]);

  return (
    <Select
      value={value}
      onValueChange={(val) => {
        onValueChange(val);
        setCurrentPage(1);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="hover:bg-accent text-muted-foreground h-7 w-auto min-w-[120px] border-none bg-transparent text-[11px] font-medium shadow-none">
        {!selectedDatasource && <DatabaseIcon className="mr-1.5 h-3 w-3" />}
        <SelectValue placeholder="Select datasource" />
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="h-[240px] w-[200px] overflow-hidden"
      >
        <div className="flex h-full w-full flex-col overflow-hidden">
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
          >
            {paginatedDatasources.map((ds) => (
              <SelectItem key={ds.id} value={ds.id} className="min-h-[32px]">
                {renderDatasourceOption(ds)}
              </SelectItem>
            ))}
            {/* Spacer to maintain fixed height when fewer items */}
            {paginatedDatasources.length < ITEMS_PER_PAGE && (
              <div className="flex-1" />
            )}
          </div>
          {totalPages > 1 && (
            <>
              <div className="border-border h-px shrink-0 border-t" />
              <div className="flex shrink-0 items-center justify-center gap-1 px-2 py-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={currentPage === 1}
                  aria-label="Previous page"
                >
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <span className="text-muted-foreground px-1 text-[10px] font-medium">
                  {currentPage}/{totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setCurrentPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={currentPage === totalPages}
                  aria-label="Next page"
                >
                  <ArrowDown className="h-3 w-3" />
                </Button>
              </div>
            </>
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

function NotebookCellComponent({
  cell,
  datasources,
  onQueryChange,
  onTitleChange,
  onDatasourceChange,
  onRunQuery,
  onRunQueryWithAgent,
  dragHandleProps,
  dragHandleRef,
  footerDragHandleProps,
  footerDragHandleRef,
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
  totalCellCount = 1,
  activeAiPopup,
  onOpenAiPopup,
  onCloseAiPopup,
  isAdvancedMode = true,
  triggerTitleEdit = false,
  isNotebookLoading = false,
  reportContent,
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
  const isEditingRef = useRef(false);
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
  const [copySuccess, setCopySuccess] = useState(false);
  const [deleteAnimating, setDeleteAnimating] = useState(false);
  const [resultView, setResultView] = useState<
    'table' | 'graphs' | 'api' | 'data-app' | 'report'
  >('table');

  // Cell title state - inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(cell.title || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const justEnteredEditModeRef = useRef(false);

  // Sync title value when cell.title changes
  useEffect(() => {
    setTimeout(() => {
      setTitleValue(cell.title || '');
    }, 0);
  }, [cell.title]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      justEnteredEditModeRef.current = true;
      // Use requestAnimationFrame and setTimeout to ensure dropdown has closed and DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          titleInputRef.current?.focus();
          titleInputRef.current?.select();
          // Reset the flag after a delay to allow blur to work normally
          setTimeout(() => {
            justEnteredEditModeRef.current = false;
          }, 200);
        }, 100);
      });
    }
  }, [isEditingTitle]);

  // Trigger edit mode from outside
  useEffect(() => {
    if (triggerTitleEdit && isQueryCell) {
      setTimeout(() => {
        setTitleValue(cell.title || '');
        setIsEditingTitle(true);
      }, 0);
    }
  }, [triggerTitleEdit, isQueryCell, cell.title]);

  const handleTitleSave = useCallback(() => {
    const trimmed = titleValue.trim();
    // Allow empty titles - if empty, pass empty string
    const finalTitle = trimmed;
    if (onTitleChange) {
      onTitleChange(finalTitle);
    }
    setIsEditingTitle(false);
  }, [titleValue, onTitleChange]);

  const handleTitleBlur = useCallback(() => {
    // Only save on blur if we're still in edit mode (not cancelled)
    // Don't save immediately after entering edit mode (prevents dropdown close from triggering save)
    if (isEditingTitle && !justEnteredEditModeRef.current) {
      handleTitleSave();
    }
  }, [isEditingTitle, handleTitleSave]);

  const handleTitleCancel = useCallback(() => {
    setTitleValue(cell.title || '');
    setIsEditingTitle(false);
  }, [cell.title]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleTitleSave();
      } else if (e.key === 'Escape') {
        handleTitleCancel();
      }
    },
    [handleTitleSave, handleTitleCancel],
  );

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
    isEditingRef.current = false;
    setTimeout(() => {
      setLocalQuery(persistedQuery);
    }, 0);
  }, [cell.cellId, persistedQuery]);

  useEffect(() => {
    if (!isEditingRef.current) {
      setTimeout(() => {
        setLocalQuery(persistedQuery);
      }, 0);
    }
  }, [persistedQuery]);

  const handleQueryChange = useCallback(
    (value: string) => {
      isEditingRef.current = true;
      setLocalQuery(value);
      startTransition(() => {
        onQueryChange(value);
      });
      setTimeout(() => {
        isEditingRef.current = false;
      }, 200);
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
      <div className="flex w-full min-w-0 items-center gap-2">
        {ds.logo ? (
          <img
            src={ds.logo}
            alt={`${displayName} logo`}
            className={cn(
              'h-4 w-4 flex-shrink-0 rounded object-contain',
              ds.id === 'json-online' && 'dark:invert',
            )}
          />
        ) : (
          <span className="bg-muted inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-semibold uppercase">
            {initials}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[11px]">
          {displayName}
        </span>
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
    <div className="relative">
      {/* Drag handle - outside cell, on the left */}
      <button
        type="button"
        className="text-muted-foreground/30 hover:text-foreground absolute top-4 -left-8 z-20 cursor-grab border-0 bg-transparent p-0 opacity-0 transition-all duration-200 group-hover:opacity-100 active:cursor-grabbing"
        ref={dragHandleRef}
        {...dragHandleProps}
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div
        ref={cellContainerRef}
        data-cell-id={cell.cellId}
        className={cn(
          'group relative flex w-full min-w-0 flex-col overflow-hidden rounded-xl border transition-all duration-200',
          isDragging && 'opacity-50',
          // Yellow border when editing title
          isEditingTitle && 'border-2 border-yellow-500',
          // Cell type specific styling (only apply if not editing title)
          !isEditingTitle &&
            isTextCell &&
            'border-border hover:border-border border-2 border-dashed bg-transparent shadow-none',
          !isEditingTitle &&
            isPromptCell &&
            'border-border/60 bg-muted/20 hover:border-border/70 border-2 border-dashed',
          !isEditingTitle &&
            isQueryCell &&
            'border-black/20 shadow-sm hover:border-black/30 hover:shadow-md dark:border-white/30 dark:hover:border-white/40',
          !isEditingTitle &&
            !isTextCell &&
            !isPromptCell &&
            !isQueryCell &&
            'hover:border-border/80 hover:shadow-sm',
        )}
      >
        {/* Cell Title Header - Only for query cells, show only if title exists */}
        {isQueryCell && cell.title && cell.title.trim().length > 0 && (
          <div
            className={cn(
              'border-border flex min-h-[44px] items-center justify-between rounded-t-xl border-b bg-transparent px-3 py-2',
              !isEditingTitle && 'cursor-grab active:cursor-grabbing',
            )}
            onMouseEnter={() => setIsHoveringTitle(true)}
            onMouseLeave={() => setIsHoveringTitle(false)}
            {...(!isEditingTitle && dragHandleProps
              ? (dragHandleProps as unknown as React.HTMLAttributes<HTMLDivElement>)
              : {})}
          >
            <div
              className="flex flex-1 items-center gap-2"
              onMouseDown={(e) => {
                // Allow dragging only if clicking on the span (title text), not on buttons
                if ((e.target as HTMLElement).closest('button')) {
                  e.stopPropagation();
                }
              }}
            >
              {isEditingTitle ? (
                <>
                  <Input
                    ref={titleInputRef}
                    value={titleValue}
                    onChange={(e) => setTitleValue(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="text-foreground h-auto flex-1 border-0 bg-transparent px-2 py-0 text-base leading-normal font-semibold shadow-none focus-visible:ring-0 md:text-base"
                    placeholder="Cell title..."
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={handleTitleCancel}
                    aria-label="Discard changes"
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-foreground text-base leading-normal font-semibold">
                    {cell.title}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-6 w-6 shrink-0 transition-opacity ${isHoveringTitle ? 'opacity-100' : 'opacity-0'}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setTitleValue(cell.title || '');
                      setIsEditingTitle(true);
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                    }}
                    aria-label="Edit title"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
        {/* Show title section in edit mode even if title is empty */}
        {isQueryCell &&
          isEditingTitle &&
          (!cell.title || cell.title.trim().length === 0) && (
            <div className="border-border flex min-h-[44px] items-center justify-between rounded-t-xl border-b bg-transparent px-3 py-2">
              <div
                className="flex flex-1 items-center gap-2"
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).closest('button')) {
                    e.stopPropagation();
                  }
                }}
              >
                <Input
                  ref={titleInputRef}
                  value={titleValue}
                  onChange={(e) => setTitleValue(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={handleTitleKeyDown}
                  className="text-foreground h-auto flex-1 border-0 bg-transparent px-2 py-0 text-base leading-normal font-semibold shadow-none focus-visible:ring-0 md:text-base"
                  placeholder="Cell title..."
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={handleTitleCancel}
                  aria-label="Discard changes"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}

        {/* Cell content */}
        <div
          className={cn(
            'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl bg-transparent',
            isTextCell && 'min-h-[180px]',
            isQueryCell && 'min-h-[240px]',
            isPromptCell && 'min-h-[200px]',
          )}
        >
          {isQueryCell && (
            <div className="pointer-events-none absolute top-4 right-4 z-20">
              <div className="pointer-events-auto">
                <Button
                  size="sm"
                  onClick={handleRunQuery}
                  disabled={!query.trim() || isLoading || !selectedDatasource}
                  className="h-7 gap-1.5 bg-[#ffcb51] px-2 text-xs font-semibold text-black shadow-sm transition-all hover:bg-[#ffcb51]/90 disabled:opacity-50"
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
              </div>
            </div>
          )}
          {/* Editor Area */}
          <div
            ref={editorContainerRef}
            className={cn(
              'relative flex-1 rounded-none',
              isQueryCell
                ? '[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 max-h-[600px] min-h-[240px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent'
                : '[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 min-h-[40px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent',
            )}
          >
            {isQueryCell ? (
              <>
                <div
                  ref={codeMirrorRef}
                  className="relative min-h-[240px] w-full"
                >
                  <CodeMirror
                    value={query}
                    onChange={(value) => handleQueryChange(value)}
                    extensions={[
                      sql(),
                      EditorView.lineWrapping,
                      (() => {
                        const isMac =
                          typeof navigator !== 'undefined' &&
                          /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
                        const modifier = isMac ? '⌘' : 'Ctrl';
                        return placeholder(
                          `Press ${modifier}+K to use AI assistant`,
                        );
                      })(),
                    ]}
                    theme={isDarkMode ? oneDark : undefined}
                    editable={!isLoading && !isNotebookLoading}
                    basicSetup={{
                      lineNumbers: true,
                      foldGutter: true,
                      dropCursor: false,
                      allowMultipleSelections: false,
                    }}
                    className="[&_.cm-scroller::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_.cm-scroller::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 [&_.cm-editor]:bg-muted/30 [&_.cm-editor.cm-focused]:bg-muted/30 [&_.cm-scroller]:bg-muted/30 [&_.cm-editor_.cm-content]:bg-muted/30 [&_.cm-gutter]:bg-muted/50 [&_.cm-gutterElement]:bg-muted/50 [&_.cm-lineNumbers]:bg-muted/50 dark:[&_.cm-editor]:bg-muted/20 dark:[&_.cm-editor.cm-focused]:bg-muted/20 dark:[&_.cm-scroller]:bg-muted/20 dark:[&_.cm-editor_.cm-content]:bg-muted/20 dark:[&_.cm-gutter]:bg-muted/40 dark:[&_.cm-gutterElement]:bg-muted/40 dark:[&_.cm-lineNumbers]:bg-muted/40 [&_.cm-content]:px-4 [&_.cm-content]:py-4 [&_.cm-content]:pr-12 [&_.cm-scroller]:overflow-visible [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm [&_.cm-scroller::-webkit-scrollbar]:w-2 [&_.cm-scroller::-webkit-scrollbar-thumb]:rounded-full [&_.cm-scroller::-webkit-scrollbar-track]:bg-transparent"
                    data-test="notebook-sql-editor"
                  />
                </div>
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
              </>
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
                        disabled={isLoading || isNotebookLoading}
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
                    disabled={isLoading || isNotebookLoading}
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
            ref={footerDragHandleRef}
            className={cn(
              'border-border bg-background z-10 flex shrink-0 items-center justify-between rounded-b-xl border-t px-2 pt-2 pb-2 shadow-sm transition-all duration-200',
              isTextCell &&
                markdownView === 'preview' &&
                'h-0 overflow-hidden opacity-0 group-hover:h-10 group-hover:opacity-100',
              isPromptCell &&
                'h-0 overflow-hidden opacity-0 group-hover:h-10 group-hover:opacity-100',
              (!isTextCell && !isPromptCell) ||
                (isTextCell && markdownView === 'edit')
                ? 'h-10'
                : '',
              footerDragHandleProps && 'cursor-grab active:cursor-grabbing',
            )}
            {...(footerDragHandleProps
              ? {
                  onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
                    const target = e.target as HTMLElement;
                    if (
                      target.closest('button') ||
                      target.closest('[role="tablist"]') ||
                      target.closest('[role="combobox"]') ||
                      target.closest('[role="option"]') ||
                      target.closest('[role="menu"]')
                    ) {
                      return;
                    }
                    footerDragHandleProps.onPointerDown?.(e);
                  },
                  onKeyDown: footerDragHandleProps.onKeyDown,
                  onKeyUp: footerDragHandleProps.onKeyUp,
                }
              : {})}
          >
            <div className="flex items-center gap-1">
              {isQueryCell && isAdvancedMode && (
                <Button
                  size="icon"
                  variant="ghost"
                  className={cn(
                    'h-8 w-8',
                    showAIPopup
                      ? 'bg-accent text-foreground'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                  onClick={() => {
                    if (showAIPopup) {
                      onCloseAiPopup();
                    } else {
                      onOpenAiPopup(cell.cellId, { x: 0, y: 0 });
                    }
                  }}
                  aria-label="Toggle AI assistant"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
              )}
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
                className="text-muted-foreground hover:text-foreground h-8 w-8 transition-all duration-200"
                onClick={async () => {
                  await navigator.clipboard.writeText(query);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 1500);
                }}
                aria-label="Copy code"
              >
                <div className="relative h-4 w-4">
                  <Copy
                    className={cn(
                      'absolute inset-0 h-4 w-4 transition-all duration-200',
                      copySuccess
                        ? 'scale-0 rotate-90 opacity-0'
                        : 'scale-100 rotate-0 opacity-100',
                    )}
                  />
                  <Check
                    className={cn(
                      'absolute inset-0 h-4 w-4 text-green-600 transition-all duration-200 dark:text-green-400',
                      copySuccess
                        ? 'scale-100 rotate-0 opacity-100'
                        : 'scale-0 -rotate-90 opacity-0',
                    )}
                  />
                </div>
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className={cn(
                  'text-muted-foreground hover:text-destructive h-8 w-8 transition-all duration-200',
                  deleteAnimating && '[animation:shake_0.4s_ease-in-out]',
                )}
                onClick={() => {
                  setDeleteAnimating(true);
                  setTimeout(() => {
                    setDeleteAnimating(false);
                    onDelete();
                  }, 200);
                }}
                aria-label="Delete cell"
                disabled={totalCellCount === 1}
              >
                <Trash2
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    deleteAnimating && 'scale-110',
                  )}
                />
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
                  {isQueryCell &&
                    (!cell.title || cell.title.trim().length === 0) && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setTitleValue('');
                          setIsEditingTitle(true);
                          setTimeout(() => {
                            requestAnimationFrame(() => {
                              setTimeout(() => {
                                const input = titleInputRef.current;
                                if (input) {
                                  input.focus();
                                  input.select();
                                }
                              }, 100);
                            });
                          }, 50);
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Add cell title
                      </DropdownMenuItem>
                    )}
                  <DropdownMenuItem
                    onClick={onMoveUp}
                    disabled={totalCellCount === 1}
                    className="transition-all duration-200"
                  >
                    <ArrowUp className="mr-2 h-4 w-4 transition-transform duration-200" />
                    Move up
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={onMoveDown}
                    disabled={totalCellCount === 1}
                    className="transition-all duration-200"
                  >
                    <ArrowDown className="mr-2 h-4 w-4 transition-transform duration-200" />
                    Move down
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onFullView}>
                    <Maximize2 className="mr-2 h-4 w-4" />
                    Full view
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isQueryCell && result && (
              <Tabs
                value={resultView}
                onValueChange={(v) =>
                  setResultView(
                    v as 'table' | 'graphs' | 'api' | 'data-app' | 'report',
                  )
                }
              >
                <TabsList className="bg-muted/50 h-8 gap-0.5 p-0.5">
                  <TabsTrigger
                    value="table"
                    className="data-[state=active]:bg-background h-7 gap-1.5 px-2.5 text-xs"
                  >
                    <Table2 className="h-3.5 w-3.5" />
                    Table
                  </TabsTrigger>
                  <TabsTrigger
                    value="graphs"
                    className="data-[state=active]:bg-background h-7 gap-1.5 px-2.5 text-xs"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                    Graphs
                  </TabsTrigger>
                  <TabsTrigger
                    value="api"
                    className="data-[state=active]:bg-background h-7 gap-1.5 px-2.5 text-xs"
                  >
                    <FileJson className="h-3.5 w-3.5" />
                    API
                  </TabsTrigger>
                  <TabsTrigger
                    value="data-app"
                    className="data-[state=active]:bg-background h-7 gap-1.5 px-2.5 text-xs"
                  >
                    Data App
                  </TabsTrigger>
                  <TabsTrigger
                    value="report"
                    className="data-[state=active]:bg-background h-7 gap-1.5 px-2.5 text-xs"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    Report
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            )}

            <div className="flex items-center gap-2">
              {(isQueryCell || isPromptCell) && (
                <DatasourceSelectWithPagination
                  value={selectedDatasource ?? undefined}
                  onValueChange={(value) => onDatasourceChange(value)}
                  datasources={datasources}
                  renderDatasourceOption={renderDatasourceOption}
                  disabled={datasources.length === 0}
                />
              )}
            </div>
          </div>

          {/* Results - Table/Graphs/API/Data App/Report */}
          {isQueryCell && result && (
            <div
              className="border-border flex flex-shrink-0 flex-col overflow-hidden border-t p-0"
              data-test="notebook-query-results"
              style={{ height: 400 }}
            >
              {resultView === 'table' && (
                <NotebookDataGrid result={result} className="h-full" />
              )}
              {resultView === 'graphs' && (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  Graphs view – coming soon
                </div>
              )}
              {resultView === 'api' && (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  API view – coming soon
                </div>
              )}
              {resultView === 'data-app' && (
                <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                  Data App – coming soon
                </div>
              )}
              {resultView === 'report' && (
                <div className="h-full overflow-auto px-4 py-2">
                  {reportContent ? (
                    <ReportRenderer content={reportContent} />
                  ) : result ? (
                    <ResultReportView result={result} />
                  ) : (
                    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                      Run the query to see a report
                    </div>
                  )}
                </div>
              )}
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
    </div>
  );
}

NotebookCellComponent.displayName = 'NotebookCell';

export const NotebookCell = memo(NotebookCellComponent);
