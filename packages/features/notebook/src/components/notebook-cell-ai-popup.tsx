'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useState, useRef } from 'react';

import { Send, AlertCircle, GripVertical } from 'lucide-react';

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
  onRunQueryWithAgent?: (
    query: string,
    datasourceId: string,
    cellType?: 'query' | 'prompt',
  ) => void;
  cellType?: 'query' | 'prompt';
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
  cellType,
  isLoading = false,
  enableShortcut = true,
}: NotebookCellAiPopupProps) {
  const [showDatasourceError, setShowDatasourceError] = useState(false);
  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    placement: 'above' | 'below';
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const resizeStartPos = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
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
      const containerWidth = editorContainerRef.current.clientWidth;
      const calculatedWidth = Math.min(containerWidth - 32, 400);
      const calculatedHeight = 160;
      setTimeout(
        () =>
          setPopupPosition({
            top: 40,
            left: 16,
            width: calculatedWidth,
            height: calculatedHeight,
            placement: 'below',
          }),
        0,
      );
      return;
    }

    // Prefer first line if available, otherwise use active line or cursor line
    const firstLine = cmEditor.querySelector('.cm-line') as HTMLElement | null;
    const activeLine = cmEditor.querySelector(
      '.cm-activeLine',
    ) as HTMLElement | null;
    const cursor = cmEditor.querySelector('.cm-cursor') as HTMLElement | null;
    const lineElement =
      firstLine ||
      activeLine ||
      (cursor?.closest('.cm-line') as HTMLElement | null);

    if (!lineElement) {
      // Use setTimeout to avoid synchronous setState in effect
      const containerWidth = editorContainerRef.current.clientWidth;
      const calculatedWidth = Math.min(containerWidth - 32, 400);
      const calculatedHeight = 160;
      setTimeout(
        () =>
          setPopupPosition({
            top: 4,
            left: 16,
            width: calculatedWidth,
            height: calculatedHeight,
            placement: 'below',
          }),
        0,
      );
      return;
    }

    const lineRect = lineElement.getBoundingClientRect();
    const containerRect = codeMirrorRef.current.getBoundingClientRect();
    const editorContainerRect =
      editorContainerRef.current.getBoundingClientRect();

    const popupHeight = 160; // max-h-[160px] - smaller popup
    const popupTopOffset = 4; // spacing from line - reduced

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

    // Calculate width based on container width, with max constraint
    const containerWidth = editorContainerRect.width;
    const calculatedWidth = Math.min(containerWidth - 32, 400);
    const calculatedHeight = 160;

    setTimeout(
      () =>
        setPopupPosition({
          top: Math.max(4, top),
          left: 16,
          width: calculatedWidth,
          height: calculatedHeight,
          placement,
        }),
      0,
    );
  }, [isOpen, isQueryCell, codeMirrorRef, editorContainerRef]);

  // Drag functionality
  useEffect(() => {
    if (
      !isDragging ||
      !popupPosition ||
      !editorContainerRef.current ||
      !popupRef.current
    ) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartPos.current || !popupPosition) return;

      const container = editorContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const deltaX = e.clientX - dragStartPos.current.x;
      const deltaY = e.clientY - dragStartPos.current.y;

      const newLeft = Math.max(
        0,
        Math.min(
          popupPosition.left + deltaX,
          containerRect.width - popupPosition.width,
        ),
      );
      const newTop = Math.max(
        0,
        Math.min(
          popupPosition.top + deltaY,
          containerRect.height - popupPosition.height,
        ),
      );

      setPopupPosition((prev) =>
        prev ? { ...prev, left: newLeft, top: newTop } : null,
      );
      dragStartPos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartPos.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, popupPosition, editorContainerRef]);

  // Resize functionality
  useEffect(() => {
    if (
      !isResizing ||
      !popupPosition ||
      !editorContainerRef.current ||
      !popupRef.current
    ) {
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeStartPos.current || !popupPosition) return;

      const container = editorContainerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const deltaX = e.clientX - resizeStartPos.current.x;
      const deltaY = e.clientY - resizeStartPos.current.y;

      const minWidth = 200;
      const minHeight = 100;
      const maxWidth = containerRect.width - popupPosition.left;
      const maxHeight = containerRect.height - popupPosition.top;

      const newWidth = Math.max(
        minWidth,
        Math.min(resizeStartPos.current.width + deltaX, maxWidth),
      );
      const newHeight = Math.max(
        minHeight,
        Math.min(resizeStartPos.current.height + deltaY, maxHeight),
      );

      setPopupPosition((prev) =>
        prev ? { ...prev, width: newWidth, height: newHeight } : null,
      );
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeStartPos.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, popupPosition, editorContainerRef]);

  if (!isOpen || !isQueryCell || !popupPosition) {
    return null;
  }

  const handleDragStart = (e: React.MouseEvent) => {
    if (
      e.target === e.currentTarget ||
      (e.target as HTMLElement).closest('[data-drag-handle]')
    ) {
      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      e.preventDefault();
    }
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    if (!popupPosition) return;
    setIsResizing(true);
    resizeStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      width: popupPosition.width,
      height: popupPosition.height,
    };
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={popupRef}
      data-ai-popup
      className={cn(
        'bg-background/95 border-border absolute z-50 flex flex-col overflow-hidden rounded-lg border shadow-xl backdrop-blur-sm',
        isOpen
          ? 'animate-in fade-in-0 zoom-in-95'
          : 'animate-out fade-out-0 zoom-out-95',
        isDragging && 'cursor-grabbing',
        !isDragging && 'cursor-grab',
      )}
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        width: `${popupPosition.width}px`,
        height: `${popupPosition.height}px`,
      }}
      onMouseDown={handleDragStart}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Drag handle */}
      <div
        data-drag-handle
        className="border-border bg-muted/30 hover:bg-muted/50 flex h-6 cursor-grab items-center justify-center border-b"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleDragStart(e);
        }}
      >
        <GripVertical className="text-muted-foreground h-3 w-3" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!aiQuestion.trim() || !onRunQueryWithAgent || isLoading) return;

          if (!selectedDatasource) {
            setShowDatasourceError(true);
            return;
          }

          setShowDatasourceError(false);
          onRunQueryWithAgent(aiQuestion, selectedDatasource, cellType);
        }}
        className="relative flex h-full w-full flex-col overflow-y-auto"
      >
        {showDatasourceError && !selectedDatasource && (
          <Alert
            variant="destructive"
            className="mb-2 flex shrink-0 items-center gap-2 px-3 py-1.5"
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">
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
          className="border-border bg-background/95 [&::-webkit-scrollbar-thumb]:bg-muted-foreground/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 relative w-full flex-1 resize-none overflow-y-auto rounded-lg border-0 text-sm shadow-inner focus-visible:ring-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent"
          autoFocus
          disabled={isLoading}
        />
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 z-10 flex h-5 w-5 cursor-pointer items-center justify-center rounded transition"
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
          className="absolute right-2 bottom-2 h-7 w-7 rounded-full shadow-lg"
          disabled={!aiQuestion.trim() || isLoading}
        >
          {isLoading ? (
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Send className="h-3 w-3" />
          )}
        </Button>
      </form>
      {/* Resize handle */}
      <div
        className="bg-border/50 hover:bg-border absolute right-0 bottom-0 h-4 w-4 cursor-nwse-resize"
        onMouseDown={handleResizeStart}
        style={{
          clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
        }}
      />
    </div>
  );
}
