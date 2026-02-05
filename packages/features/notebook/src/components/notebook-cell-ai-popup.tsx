'use client';

import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useEffect, useState, useRef } from 'react';
import { ArrowUp, GripVertical, X } from 'lucide-react';
import { Button } from '@qwery/ui/button';
import { Textarea } from '@qwery/ui/textarea';
import { PromptInputSubmit } from '@qwery/ui/ai-elements';
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
  embedded?: boolean;
  onNoDatasourceError?: () => void;
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
  embedded = false,
  onNoDatasourceError,
}: NotebookCellAiPopupProps) {
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

      if (target.closest('[data-ai-popup]')) return;

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
    if (!isOpen || !isQueryCell || !shortcutEnabled) return;

    const focusTimeout = setTimeout(() => aiInputRef.current?.focus(), 0);

    return () => {
      clearTimeout(focusTimeout);
    };
  }, [aiInputRef, isOpen, isQueryCell, shortcutEnabled]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseAiPopup();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onCloseAiPopup]);

  useEffect(() => {
    if (embedded) return;
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

    const popupHeight = 160;
    const popupTopOffset = 12;

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

    const containerWidth = editorContainerRect.width;
    const calculatedWidth = Math.min(containerWidth - 32, 440);
    const calculatedHeight = 180;

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
  }, [embedded, isOpen, isQueryCell, codeMirrorRef, editorContainerRef]);

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

      const minWidth = 240;
      const minHeight = 120;
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

  const renderForm = () => (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!aiQuestion.trim() || !onRunQueryWithAgent || isLoading) return;
        if (!selectedDatasource) return;

        onRunQueryWithAgent(aiQuestion, selectedDatasource, cellType);
      }}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <Textarea
        ref={aiInputRef}
        value={aiQuestion}
        onChange={(e) => setAiQuestion(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey) return;
          e.preventDefault();
          if (!aiQuestion.trim() || isLoading) return;
          if (!selectedDatasource) {
            onNoDatasourceError?.();
            return;
          }
          const form = e.currentTarget.form;
          if (form) form.requestSubmit();
        }}
        placeholder={
          cellType === 'prompt'
            ? 'Describe what you want the AI to do...'
            : 'Describe the query you need or ask a question...'
        }
        className="text-foreground placeholder:text-muted-foreground min-h-0 flex-1 resize-none border-0 bg-transparent pt-8 pr-3 pb-10 pl-3 text-sm focus-visible:ring-0"
        autoFocus
        disabled={isLoading}
      />

      <PromptInputSubmit
        type="submit"
        className="absolute right-2 bottom-2 z-10 h-8"
        disabled={!aiQuestion.trim() || isLoading}
        status={isLoading ? 'submitted' : undefined}
      >
        {isLoading ? (
          <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <ArrowUp className="size-4" />
        )}
      </PromptInputSubmit>
    </form>
  );

  if (embedded && isQueryCell) {
    return (
      <div
        data-ai-popup
        className={cn(
          'border-border bg-muted/20 relative flex shrink-0 flex-col border-t p-4 transition-all duration-200 ease-out',
          isOpen
            ? 'max-h-[50vh] min-h-[100px] opacity-100'
            : 'pointer-events-none max-h-0 min-h-0 overflow-hidden border-t-0 p-0 opacity-0',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground absolute top-2 right-2 z-10 size-7"
          onClick={onCloseAiPopup}
          aria-label="Close"
        >
          <X className="size-4" />
        </Button>
        {renderForm()}
      </div>
    );
  }

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
        'absolute z-50 flex flex-col overflow-hidden transition-all duration-200 ease-out',
        'border-border bg-background/95 backdrop-blur-sm',
        'rounded-lg border shadow-md',
        isOpen
          ? 'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2'
          : 'animate-out fade-out-0 zoom-out-95',
        isDragging ? 'cursor-grabbing' : 'cursor-default',
      )}
      style={{
        top: `${popupPosition.top}px`,
        left: `${popupPosition.left}px`,
        width: `${popupPosition.width}px`,
        height: `${popupPosition.height}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        data-drag-handle
        className="text-muted-foreground/50 hover:text-muted-foreground absolute top-1 left-1 z-10 cursor-grab select-none active:cursor-grabbing"
        onMouseDown={(e) => {
          e.stopPropagation();
          handleDragStart(e);
        }}
        aria-label="Drag to move"
      >
        <GripVertical className="size-3.5" />
      </div>

      {renderForm()}

      <div
        className="absolute right-0 bottom-0 z-20 h-4 w-4 cursor-nwse-resize opacity-0 transition-opacity hover:opacity-100"
        onMouseDown={handleResizeStart}
      >
        <div className="bg-muted-foreground/50 absolute right-1 bottom-1 h-1.5 w-1.5 rounded-sm" />
      </div>
    </div>
  );
}
