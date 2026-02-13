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
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  DatabaseIcon,
  GripVertical,
  Loader2,
  Maximize2,
  MoreVertical,
  Pencil,
  PlayIcon,
  Search,
  Sparkles,
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
import { Textarea } from '@qwery/ui/textarea';
import { cn } from '@qwery/ui/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@qwery/ui/collapsible';

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
  cellIndex?: number;
  hasAgentResponse?: boolean;
  onNoDatasourceError?: () => void;
}

const ITEMS_PER_PAGE = 10;
const DS_ITEM_HEIGHT_PX = 32;

function formatQueryDuration(ms: number | null | undefined): string {
  if (ms == null) return '';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${(ms / 60000).toFixed(1)} m`;
}

const DS_PLACEHOLDER = 'Select datasource';

function DatasourceSelectWithPagination({
  value,
  onValueChange,
  datasources,
  renderDatasourceOption,
  disabled,
  placeholder = DS_PLACEHOLDER,
}: {
  value?: string;
  onValueChange: (value: string | null) => void;
  datasources: NotebookDatasourceInfo[];
  renderDatasourceOption: (ds: NotebookDatasourceInfo) => React.ReactNode;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const selectedDatasource = datasources.find((ds) => ds.id === value);

  const filteredAndSorted = useMemo(() => {
    let list = datasources;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = datasources.filter(
        (ds) =>
          ds.name.toLowerCase().includes(q) ||
          (ds.provider ?? '').toLowerCase().includes(q),
      );
    }
    return [...list].sort((a, b) => {
      const cmp = a.name.localeCompare(b.name, undefined, {
        sensitivity: 'base',
      });
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [datasources, search, sortOrder]);

  const totalPages = Math.ceil(filteredAndSorted.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDatasources = filteredAndSorted.slice(startIndex, endIndex);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortOrder]);

  const showClear = search.trim().length > 0 || value != null;
  const listHeightPx = ITEMS_PER_PAGE * DS_ITEM_HEIGHT_PX;

  const handleClearSearchOrSelection = () => {
    if (search.trim()) {
      setSearch('');
    } else if (value != null) {
      onValueChange(null);
    }
  };

  return (
    <Select
      value={value ?? undefined}
      onValueChange={(val) => {
        onValueChange(val ?? null);
        setCurrentPage(1);
      }}
      disabled={disabled}
    >
      <SelectTrigger className="hover:bg-accent text-muted-foreground h-7 w-auto min-w-[120px] border-none bg-transparent text-[11px] font-medium shadow-none">
        {!selectedDatasource && <DatabaseIcon className="mr-1.5 h-3 w-3" />}
        {selectedDatasource ? (
          <SelectValue />
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </SelectTrigger>
      <SelectContent
        position="popper"
        className="flex h-[420px] w-[280px] flex-col overflow-hidden p-0"
      >
        <div
          className="border-border bg-popover sticky top-0 z-10 flex shrink-0 items-center gap-1 border-b px-2 py-1.5"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <div className="relative min-w-0 flex-1">
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                'h-7 w-full border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-0',
                showClear && 'pr-7',
              )}
            />
            {showClear ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleClearSearchOrSelection();
                }}
                className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0 flex shrink-0 -translate-y-1/2 rounded p-1 transition-colors"
                aria-label={search.trim() ? 'Clear search' : 'Clear selection'}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSortOrder('asc');
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground flex shrink-0 rounded p-1 transition-colors',
              sortOrder === 'asc' && 'bg-accent text-accent-foreground',
            )}
            aria-label="Sort A–Z"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setSortOrder('desc');
            }}
            className={cn(
              'text-muted-foreground hover:text-foreground flex shrink-0 rounded p-1 transition-colors',
              sortOrder === 'desc' && 'bg-accent text-accent-foreground',
            )}
            aria-label="Sort Z–A"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <div
          className="flex shrink-0 flex-col overflow-hidden"
          style={{ height: listHeightPx }}
        >
          {paginatedDatasources.map((ds) => (
            <SelectItem key={ds.id} value={ds.id} className="min-h-[32px]">
              {renderDatasourceOption(ds)}
            </SelectItem>
          ))}
          {paginatedDatasources.length === 0 && (
            <div className="text-muted-foreground flex h-full items-center justify-center text-xs">
              No datasources found
            </div>
          )}
        </div>
        {totalPages > 0 && (
          <div className="border-border flex shrink-0 items-center justify-between gap-2 border-t bg-zinc-200/90 px-2 py-1.5 dark:bg-zinc-800/90">
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
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <span className="text-muted-foreground text-[10px] font-medium">
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
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        )}
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
  cellIndex,
  hasAgentResponse = false,
  onNoDatasourceError,
}: NotebookCellProps) {
  const isMac =
    typeof navigator !== 'undefined' &&
    /Mac|iPhone|iPod|iPad/i.test(navigator.platform);
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
  const isScrollingRef = useRef(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [deleteAnimating, setDeleteAnimating] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(true);
  const [errorOpen, setErrorOpen] = useState(true);

  // Cell title state - inline editing
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isHoveringTitle, setIsHoveringTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(cell.title || '');
  const titleInputRef = useRef<HTMLInputElement>(null);
  const justEnteredEditModeRef = useRef(false);

  // Open results collapsible on every new run (when result changes)
  useEffect(() => {
    if (result != null) {
      setResultsOpen(true);
    }
  }, [result]);

  // Open error collapsible when error appears
  useEffect(() => {
    if (typeof error === 'string' && error.trim().length > 0) {
      setErrorOpen(true);
    }
  }, [error]);

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

  const handleRunQuery = useCallback(() => {
    if (
      onRunQuery &&
      query &&
      cell.cellType === 'query' &&
      selectedDatasource
    ) {
      onRunQuery(query, selectedDatasource);
    }
  }, [onRunQuery, query, cell.cellType, selectedDatasource]);

  const handlePromptSubmit = useCallback(() => {
    if (!onRunQueryWithAgent || !query.trim() || isLoading) {
      return;
    }
    const isPrompt = cell.cellType === 'prompt';
    if (!selectedDatasource && !isPrompt) {
      onNoDatasourceError?.();
      return;
    }
    onRunQueryWithAgent(
      query,
      selectedDatasource ?? '',
      cell.cellType === 'query' || cell.cellType === 'prompt'
        ? cell.cellType
        : undefined,
    );
  }, [
    onRunQueryWithAgent,
    query,
    isLoading,
    selectedDatasource,
    cell.cellType,
    onNoDatasourceError,
  ]);

  useEffect(() => {
    if (!isQueryCell) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKeyPressed = isMac ? event.metaKey : event.ctrlKey;
      const container = cellContainerRef.current;
      const target = event.target as HTMLElement | null;
      if (!container || !target || !container.contains(target)) return;

      const isInputFocused =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('.cm-editor') !== null;

      if (!isInputFocused) return;

      if (isModKeyPressed && event.key === 'Enter') {
        event.preventDefault();
        handleRunQuery();
        return;
      }

      if (isAdvancedMode && isModKeyPressed && event.key === 'k') {
        event.preventDefault();
        if (showAIPopup) {
          onCloseAiPopup();
        } else {
          onOpenAiPopup(cell.cellId, { x: 0, y: 0 });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    cell.cellId,
    handleRunQuery,
    isAdvancedMode,
    isMac,
    isQueryCell,
    onCloseAiPopup,
    onOpenAiPopup,
    showAIPopup,
  ]);

  useEffect(() => {
    if (!isPromptCell) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isModKeyPressed = isMac ? event.metaKey : event.ctrlKey;
      if (!isModKeyPressed || event.key !== 'Enter') return;

      const container = cellContainerRef.current;
      const target = event.target as HTMLElement | null;
      if (!container || !target || !container.contains(target)) return;

      const isInputFocused =
        target.tagName === 'TEXTAREA' || target.isContentEditable;
      if (!isInputFocused) return;

      event.preventDefault();
      handlePromptSubmit();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPromptCell, isMac, handlePromptSubmit]);

  const renderPromptError = useCallback(() => {
    if (!isPromptCell) return null;

    const hasServerError = typeof error === 'string' && error.trim().length > 0;
    if (!hasServerError) return null;

    return (
      <div className="px-4">
        <Alert
          variant="destructive"
          className="border-destructive/40 bg-destructive/10 mt-3 mb-4 flex items-start gap-2 rounded-lg"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <AlertDescription className="line-clamp-2 text-sm break-words whitespace-pre-wrap">
            {error ?? 'Prompt failed to execute.'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }, [error, isPromptCell]);

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
    <div className="group/cell relative flex w-full">
      {/* Left side: drag handle + execution indicator aligned with first line of editor */}
      <div className="text-muted-foreground/60 hover:text-muted-foreground absolute top-4 -left-8 z-20 flex w-5 flex-col items-center transition-colors">
        <button
          type="button"
          className="cursor-grab border-0 bg-transparent p-0 active:cursor-grabbing"
          ref={dragHandleRef}
          {...dragHandleProps}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        {(isQueryCell || isPromptCell) && (
          <div
            className="absolute top-10 left-1/2 flex -translate-x-1/2 justify-center"
            aria-hidden
          >
            {isQueryCell && (
              <>
                {isLoading ? (
                  <span
                    className="text-muted-foreground text-xs font-medium"
                    title="Running"
                  >
                    *
                  </span>
                ) : typeof error === 'string' && error.trim().length > 0 ? (
                  <span title="Error">
                    <AlertCircle className="text-destructive size-4" />
                  </span>
                ) : result != null ? (
                  <span title="Executed">
                    <Check className="size-4 text-green-600 dark:text-green-400" />
                  </span>
                ) : null}
              </>
            )}
            {isPromptCell && (
              <>
                {isLoading ? (
                  <span title="Generating">
                    <Loader2 className="text-muted-foreground size-4 animate-spin" />
                  </span>
                ) : hasAgentResponse ? (
                  <span title="Response generated">
                    <Check className="size-4 text-green-600 dark:text-green-400" />
                  </span>
                ) : null}
              </>
            )}
          </div>
        )}
      </div>
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
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {/* Query cell: header row with title (or "Cell N") and Run button on same line */}
          {isQueryCell && (
            <div
              className={cn(
                'border-border flex min-h-[40px] shrink-0 items-center justify-between gap-2 rounded-none border-b bg-transparent px-3 py-2',
                !isEditingTitle && 'cursor-default',
              )}
              onMouseEnter={() => setIsHoveringTitle(true)}
              onMouseLeave={() => setIsHoveringTitle(false)}
            >
              <div
                className="flex min-w-0 flex-1 items-center gap-2"
                onMouseDown={(e) => {
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
                    <span className="text-foreground truncate text-base leading-normal font-semibold">
                      {cell.title?.trim() ||
                        `Cell ${cellIndex !== undefined ? cellIndex + 1 : cell.cellId}`}
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
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label="Edit title"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleRunQuery}
                disabled={!query.trim() || isLoading || !selectedDatasource}
                className="h-7 shrink-0 gap-1.5 bg-[#ffcb51] px-2 text-xs font-semibold text-black shadow-sm transition-all hover:bg-[#ffcb51]/90 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <PlayIcon className="size-3.5 fill-current" />
                )}
                <span>Run</span>
              </Button>
            </div>
          )}

          <div
            className={cn(
              'min-h-0 flex-1 overflow-auto',
              isQueryCell && 'flex flex-col',
            )}
          >
            {isQueryCell ? (
              <>
                <div
                  ref={editorContainerRef}
                  className="[&_.cm-scroller::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_.cm-scroller::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 border-border max-h-[400px] min-h-[88px] shrink-0 overflow-y-auto border-b [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
                >
                  <div
                    ref={codeMirrorRef}
                    className="relative min-h-[88px] w-full"
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
                      className="[&_.cm-scroller::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&_.cm-scroller::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 [&_.cm-editor]:bg-muted/30 [&_.cm-editor.cm-focused]:bg-muted/30 [&_.cm-scroller]:bg-muted/30 [&_.cm-editor_.cm-content]:bg-muted/30 [&_.cm-gutter]:bg-muted/50 [&_.cm-gutterElement]:bg-muted/50 [&_.cm-lineNumbers]:bg-muted/50 dark:[&_.cm-editor]:bg-muted/20 dark:[&_.cm-editor.cm-focused]:bg-muted/20 dark:[&_.cm-scroller]:bg-muted/20 dark:[&_.cm-editor_.cm-content]:bg-muted/20 dark:[&_.cm-gutter]:bg-muted/40 dark:[&_.cm-gutterElement]:bg-muted/40 dark:[&_.cm-lineNumbers]:bg-muted/40 [&_.cm-content]:px-4 [&_.cm-content]:py-4 [&_.cm-content]:pr-12 [&_.cm-editor]:rounded-none [&_.cm-gutter]:rounded-none [&_.cm-scroller]:overflow-visible [&_.cm-scroller]:rounded-none [&_.cm-scroller]:font-mono [&_.cm-scroller]:text-sm [&_.cm-scroller::-webkit-scrollbar]:w-2 [&_.cm-scroller::-webkit-scrollbar-thumb]:rounded-full [&_.cm-scroller::-webkit-scrollbar-track]:bg-transparent"
                      data-test="notebook-sql-editor"
                    />
                  </div>
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
                  embedded
                  onNoDatasourceError={onNoDatasourceError}
                />

                {/* Results Grid - above footer */}
                {result && (
                  <Collapsible
                    open={resultsOpen}
                    onOpenChange={setResultsOpen}
                    className="border-border shrink-0 border-t"
                  >
                    <CollapsibleTrigger className="border-border hover:bg-muted/50 flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
                      <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-normal">
                        <span className="text-foreground font-medium">
                          Results
                        </span>
                        {result.stat?.queryDurationMs != null &&
                          formatQueryDuration(result.stat.queryDurationMs) && (
                            <span>
                              {formatQueryDuration(result.stat.queryDurationMs)}
                            </span>
                          )}
                        <span>
                          {result.rows?.length ?? 0} rows ×{' '}
                          {result.columns?.length ?? 0} cols
                        </span>
                      </span>
                      <ChevronDown className="text-muted-foreground size-3.5 shrink-0 transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="min-h-0 overflow-hidden">
                      <div className="max-h-[400px] min-h-0 overflow-auto p-0">
                        <DataGrid
                          columns={result.columns?.map((col) => col.name) ?? []}
                          rows={result.rows ?? []}
                          pageSize={50}
                          className="min-w-0"
                        />
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {/* Error - above footer */}
                {typeof error === 'string' && error.trim().length > 0 && (
                  <Collapsible
                    open={errorOpen}
                    onOpenChange={setErrorOpen}
                    className="border-border shrink-0 border-t"
                  >
                    <CollapsibleTrigger className="border-border bg-destructive/5 hover:bg-destructive/10 flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
                      <span className="text-destructive flex items-center gap-2">
                        <AlertCircle className="size-3.5 shrink-0" />
                        Execution error
                      </span>
                      <ChevronDown className="text-muted-foreground size-3.5 shrink-0 transition-transform duration-200" />
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-border/50 bg-destructive/5 border-b px-3 py-3">
                        <pre className="text-destructive font-mono text-xs wrap-break-word whitespace-pre-wrap">
                          {error.trim()}
                        </pre>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            ) : (
              <div
                className={cn(
                  'relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-none bg-transparent',
                  isTextCell && 'min-h-[180px]',
                  isPromptCell && 'min-h-[120px]',
                )}
              >
                {/* Editor Area for text/prompt */}
                <div
                  ref={editorContainerRef}
                  className={cn(
                    'relative flex-1 rounded-none',
                    '[&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 min-h-[40px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent',
                  )}
                >
                  {isTextCell ? (
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
                              onChange={(e) =>
                                handleQueryChange(e.target.value)
                              }
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
                                      preview.scrollHeight -
                                        preview.clientHeight,
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
                        className="absolute top-2 right-2 z-10 h-7 gap-1.5 bg-[#ffcb51] px-2 text-xs font-semibold text-black opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:bg-[#ffcb51]/90 disabled:opacity-50"
                      >
                        {isLoading ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        <span>Generate</span>
                      </Button>
                      <div className="bg-muted/10 flex-1 px-4 py-4 pr-20">
                        <Textarea
                          ref={textareaRef}
                          value={query}
                          onChange={(e) => {
                            const el = e.target;
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                            handleQueryChange(e.target.value);
                          }}
                          disabled={isLoading || isNotebookLoading}
                          className={cn(
                            'min-h-[120px] w-full resize-none overflow-hidden border-0 bg-transparent text-sm leading-6 focus-visible:ring-0',
                            isPromptCell && 'font-mono',
                          )}
                          placeholder="Describe what you want the AI to generate..."
                        />
                        {renderPromptError()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Toolbar - always at bottom */}
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
                    'h-7 w-7',
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
                  <Sparkles className="size-3.5" />
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-7 w-7"
                onClick={onFormat}
                aria-label="Format cell"
              >
                <AlignLeft className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground hover:text-foreground h-7 w-7 transition-all duration-200"
                onClick={async () => {
                  await navigator.clipboard.writeText(query);
                  setCopySuccess(true);
                  setTimeout(() => setCopySuccess(false), 1500);
                }}
                aria-label="Copy code"
              >
                <div className="relative size-3.5">
                  <Copy
                    className={cn(
                      'absolute inset-0 size-3.5 transition-all duration-200',
                      copySuccess
                        ? 'scale-0 rotate-90 opacity-0'
                        : 'scale-100 rotate-0 opacity-100',
                    )}
                  />
                  <Check
                    className={cn(
                      'absolute inset-0 size-3.5 text-green-600 transition-all duration-200 dark:text-green-400',
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
                  'text-muted-foreground hover:text-destructive h-7 w-7 transition-all duration-200',
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
                    'size-3.5 transition-transform duration-200',
                    deleteAnimating && 'scale-110',
                  )}
                />
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground h-7 w-7"
                  >
                    <MoreVertical className="size-3.5" />
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
        </div>
      </div>
    </div>
  );
}

NotebookCellComponent.displayName = 'NotebookCell';

export const NotebookCell = memo(NotebookCellComponent);
