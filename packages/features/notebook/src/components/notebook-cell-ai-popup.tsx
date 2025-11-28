'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useState } from 'react';

import { ArrowUp, AlertCircle } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Textarea } from '@qwery/ui/textarea';
import { Alert, AlertDescription } from '@qwery/ui/alert';
import { cn } from '@qwery/ui/utils';

interface NotebookCellAiPopupProps {
  cellId: number;
  isQueryCell: boolean;
  isOpen: boolean;
  aiQuestion: string;
  setAiQuestion: Dispatch<SetStateAction<string>>;
  aiInputRef: RefObject<HTMLTextAreaElement | null>;
  cellContainerRef: RefObject<HTMLDivElement | null>;
  codeMirrorRef: RefObject<HTMLDivElement | null>;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  editorContainerRef: RefObject<HTMLDivElement | null>;
  onOpenAiPopup: (cellId: number) => void;
  onCloseAiPopup: () => void;
  onSubmit: (e: React.FormEvent) => void;
  query: string;
  selectedDatasource: string | null;
  onRunQueryWithAgent?: (query: string, datasourceId: string) => void;
  isLoading?: boolean;
  enableShortcut?: boolean;
}

export function NotebookCellAiPopup({
  cellId,
  isQueryCell,
  isOpen,
  aiQuestion,
  setAiQuestion,
  aiInputRef,
  cellContainerRef,
  codeMirrorRef,
  editorContainerRef,
  onOpenAiPopup,
  onCloseAiPopup,
  selectedDatasource,
  onRunQueryWithAgent,
  isLoading = false,
  enableShortcut = true,
}: NotebookCellAiPopupProps) {
  const [showDatasourceError, setShowDatasourceError] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    placement: 'above' | 'below';
  } | null>(null);
  const shortcutEnabled = enableShortcut && isQueryCell;

  useEffect(() => {
    if (!shortcutEnabled) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isQueryCell) {
        return;
      }
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
      onOpenAiPopup(cellId);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cellContainerRef, cellId, isQueryCell, onOpenAiPopup, shortcutEnabled]);

  useEffect(() => {
    if (!isOpen || !isQueryCell || !shortcutEnabled) {
      setTimeout(() => {
        setAiQuestion('');
        setShowDatasourceError(false);
      }, 0);
      return;
    }

    if (selectedDatasource && showDatasourceError) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setShowDatasourceError(false), 0);
    }

    const focusTimeout = setTimeout(() => aiInputRef.current?.focus(), 0);

    return () => {
      clearTimeout(focusTimeout);
    };
  }, [
    aiInputRef,
    isOpen,
    isQueryCell,
    setAiQuestion,
    selectedDatasource,
    showDatasourceError,
    shortcutEnabled,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseAiPopup();
        setAiQuestion('');
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCloseAiPopup, setAiQuestion]);

  useEffect(() => {
    if (
      !isOpen ||
      !isQueryCell ||
      !codeMirrorRef.current ||
      !editorContainerRef.current
    ) {
      setTimeout(() => setPopupPosition(null), 0);
      return;
    }

    const cmEditor = codeMirrorRef.current.querySelector(
      '.cm-editor',
    ) as HTMLElement | null;
    if (!cmEditor) {
      setTimeout(
        () => setPopupPosition({ top: 40, left: 16, placement: 'below' }),
        0,
      );
      return;
    }

    const activeLine = cmEditor.querySelector(
      '.cm-activeLine',
    ) as HTMLElement | null;
    const cursor = cmEditor.querySelector('.cm-cursor') as HTMLElement | null;
    const lineElement =
      activeLine || (cursor?.closest('.cm-line') as HTMLElement | null);

    if (!lineElement) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(
        () => setPopupPosition({ top: 40, left: 16, placement: 'below' }),
        0,
      );
      return;
    }

    const lineRect = lineElement.getBoundingClientRect();
    const containerRect = codeMirrorRef.current.getBoundingClientRect();
    const editorContainerRect =
      editorContainerRef.current.getBoundingClientRect();

    const popupHeight = 220; // max-h-[220px]
    const popupTopOffset = 8; // spacing from line

    const spaceBelow = editorContainerRect.bottom - lineRect.bottom;
    const spaceAbove = lineRect.top - editorContainerRect.top;

    const lineTopRelativeToContainer = lineRect.top - editorContainerRect.top;
    const containerHeight = editorContainerRect.height;
    const idealCenterPosition = containerHeight / 2;

    const threshold = containerHeight * 0.3;
    if (
      lineTopRelativeToContainer < threshold ||
      lineTopRelativeToContainer > containerHeight - threshold
    ) {
      const scrollContainer = editorContainerRef.current;
      const currentScrollTop = scrollContainer.scrollTop;
      const lineOffsetTop =
        lineRect.top - editorContainerRect.top + currentScrollTop;
      const targetScrollTop = lineOffsetTop - idealCenterPosition;

      scrollContainer.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth',
      });
    }

    const hasEnoughSpaceBelow = spaceBelow >= popupHeight + popupTopOffset;
    const hasEnoughSpaceAbove = spaceAbove >= popupHeight + popupTopOffset;

    let top: number;
    let placement: 'above' | 'below';

    if (hasEnoughSpaceBelow) {
      top = lineRect.bottom - containerRect.top + popupTopOffset;
      placement = 'below';
    } else if (hasEnoughSpaceAbove) {
      top = lineRect.top - containerRect.top - popupHeight - popupTopOffset;
      placement = 'above';
    } else {
      top = lineRect.bottom - containerRect.top + popupTopOffset;
      placement = 'below';
    }

    setTimeout(
      () =>
        setPopupPosition({
          top: Math.max(8, top),
          left: 16,
          placement,
        }),
      0,
    );
  }, [isOpen, isQueryCell, codeMirrorRef, editorContainerRef]);

  if (!isOpen || !isQueryCell || !popupPosition) {
    return null;
  }

  return (
    <div
      data-ai-popup
      className={cn(
        'bg-background/95 border-border absolute z-50 m-8 flex max-h-[220px] w-[90%] flex-col overflow-y-auto rounded-lg border shadow-xl backdrop-blur-sm',
        isOpen
          ? 'animate-in fade-in-0 zoom-in-95'
          : 'animate-out fade-out-0 zoom-out-95',
      )}
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!aiQuestion.trim() || !onRunQueryWithAgent || isLoading) return;

          if (!selectedDatasource) {
            setShowDatasourceError(true);
            return;
          }

          setShowDatasourceError(false);
          onRunQueryWithAgent(aiQuestion, selectedDatasource);
        }}
        className="relative flex w-full flex-col px-4 py-3"
      >
        {showDatasourceError && !selectedDatasource && (
          <Alert
            variant="destructive"
            className="mb-3 flex shrink-0 items-center gap-2"
          >
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please select a datasource first before sending an AI query.
            </AlertDescription>
          </Alert>
        )}
        <Textarea
          ref={aiInputRef}
          value={aiQuestion}
          onChange={(e) => {
            setAiQuestion(e.target.value);
            // Clear error when user starts typing
            if (showDatasourceError) {
              setShowDatasourceError(false);
            }
          }}
          placeholder="Ask the AI agent anything about this cell..."
          className="border-border bg-background/95 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 relative max-h-[160px] min-h-[110px] w-full resize-none overflow-y-auto rounded-lg border text-sm shadow-inner focus-visible:ring-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
          autoFocus
          disabled={isLoading}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground absolute top-6 right-6 z-10 flex h-5 w-5 items-center justify-center rounded transition"
          onClick={() => {
            onCloseAiPopup();
            setAiQuestion('');
          }}
          aria-label="Close AI prompt"
        >
          ×
        </button>
        <Button
          type="submit"
          size="icon"
          className="absolute right-6 bottom-6 h-8 w-8 rounded-full shadow-lg"
          disabled={!aiQuestion.trim() || isLoading}
        >
          {isLoading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <ArrowUp className="h-3 w-3" />
          )}
        </Button>
      </form>
    </div>
  );
}
