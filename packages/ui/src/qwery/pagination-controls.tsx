import { useMemo, useState, useRef, useEffect } from 'react';
import { Button } from '../shadcn/button';
import { Label } from '../shadcn/label';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from '../shadcn/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../shadcn/select';
import { cn } from '../lib/utils';
import { Input } from '../shadcn/input';
import { Check, Pencil, X } from 'lucide-react';

const MAX_CUSTOM_PAGE_SIZE = 1_000_000;
const MAX_CUSTOM_INPUT_LENGTH = 7;

export interface PaginationControlsProps {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextPageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function PaginationControls({
  page,
  pageSize,
  totalCount,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [20, 50, 100, 200],
  className,
}: PaginationControlsProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;
  const from = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalCount);
  const rangeText = `${from}-${to} of ${totalCount}`;

  const pageSizeDisplay = useMemo(() => {
    return String(pageSize);
  }, [pageSize]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customPageSize, setCustomPageSize] = useState<number | null>(
    !pageSizeOptions.includes(pageSize) ? pageSize : null,
  );
  const [customValue, setCustomValue] = useState('');
  const isCustomSelected = !pageSizeOptions.includes(pageSize);
  const customPreview = isCustomSelected
    ? String(pageSize)
    : customPageSize
      ? String(customPageSize)
      : '';
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCustomMode && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCustomMode]);

  const parsedCustomValue = Number.parseInt(customValue, 10);
  const isCustomValueInvalid =
    customValue.length > 0 &&
    (!Number.isFinite(parsedCustomValue) ||
      parsedCustomValue <= 0 ||
      parsedCustomValue > MAX_CUSTOM_PAGE_SIZE);

  const handleCustomConfirm = () => {
    const val = parseInt(customValue, 10);
    if (!isNaN(val) && val > 0 && val <= MAX_CUSTOM_PAGE_SIZE) {
      setCustomPageSize(val);
      onPageSizeChange(val);
      setIsOpen(false);
      setIsCustomMode(false);
    }
  };

  if (totalCount <= 0) return null;

  return (
    <div
      className={cn(
        'flex w-full shrink-0 items-center justify-between gap-2 pt-3 pb-8',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Label className="whitespace-nowrap">Rows per page:</Label>
        <Select
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setIsCustomMode(false);
          }}
          value={String(pageSize)}
          onValueChange={(value) => {
            if (value === 'custom') {
              if (customPageSize && customPageSize > 0) {
                onPageSizeChange(customPageSize);
                setIsOpen(false);
              } else {
                setIsCustomMode(true);
                setCustomValue('');
              }
              return;
            }
            onPageSizeChange(Number(value));
          }}
        >
          <SelectTrigger className="h-9 w-[120px]">
            <SelectValue>{pageSizeDisplay}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((n) => (
              <SelectItem key={n} value={String(n)}>
                {n}
              </SelectItem>
            ))}
            {!pageSizeOptions.includes(pageSize) && (
              <SelectItem value={String(pageSize)} className="hidden">
                {pageSize}
              </SelectItem>
            )}

            <div className="bg-border/60 mx-2 my-1 h-px" />
            {!isCustomMode ? (
              <div
                className={cn(
                  'relative flex w-full cursor-pointer items-center justify-start rounded-sm py-1.5 pr-8 pl-2 text-left text-sm transition-colors outline-none select-none',
                  isCustomSelected
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground',
                )}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  if (customPageSize && customPageSize > 0) {
                    onPageSizeChange(customPageSize);
                    setIsOpen(false);
                    return;
                  }
                  setCustomValue(customPreview || '');
                  setIsCustomMode(true);
                }}
              >
                <span>{customPreview || 'Custom'}</span>
                {customPreview && (
                  <button
                    type="button"
                    className="hover:bg-accent-foreground/10 ml-1 rounded p-0.5"
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setCustomValue(customPreview || '');
                      setIsCustomMode(true);
                    }}
                    aria-label="Edit custom page size"
                    title="Edit custom page size"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
                {isCustomSelected && (
                  <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>
            ) : (
              <div
                className="px-2 py-1"
                onPointerDown={(e) => e.stopPropagation()}
                onKeyDown={(e) => {
                  e.stopPropagation();
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCustomConfirm();
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    setIsCustomMode(false);
                  }
                }}
              >
                <div className="relative">
                  <Input
                    ref={inputRef}
                    type="number"
                    min={1}
                    max={MAX_CUSTOM_PAGE_SIZE}
                    maxLength={MAX_CUSTOM_INPUT_LENGTH}
                    step={1}
                    aria-invalid={isCustomValueInvalid}
                    placeholder={`Max ${MAX_CUSTOM_PAGE_SIZE.toLocaleString()}`}
                    className={cn(
                      'h-8 w-[140px] [appearance:textfield] pr-14 text-xs shadow-none focus-visible:ring-1 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                      isCustomValueInvalid &&
                        'border-red-500 focus-visible:ring-red-500',
                    )}
                    value={customValue}
                    onChange={(e) =>
                      setCustomValue(
                        e.target.value
                          .replace(/\D/g, '')
                          .slice(0, MAX_CUSTOM_INPUT_LENGTH),
                      )
                    }
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCustomConfirm();
                      } else if (e.key === 'Escape') {
                        setIsCustomMode(false);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-7 -translate-y-1/2 cursor-pointer text-emerald-600 hover:text-emerald-500"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isCustomValueInvalid) return;
                      handleCustomConfirm();
                    }}
                    aria-label="Confirm custom page size"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer hover:text-red-500"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomMode(false);
                    }}
                    aria-label="Cancel custom page size edit"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm whitespace-nowrap">
          {rangeText}
        </span>

        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <Button
                aria-label="Go to previous page"
                disabled={!canGoPrev}
                size="icon"
                variant="ghost"
                onClick={() => onPageChange(Math.max(1, page - 1))}
              >
                <span className="sr-only">Previous page</span>‹
              </Button>
            </PaginationItem>
            <PaginationItem>
              <Button
                aria-label="Go to next page"
                disabled={!canGoNext}
                size="icon"
                variant="ghost"
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              >
                <span className="sr-only">Next page</span>›
              </Button>
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
}
