'use client';

import { useMemo, useState } from 'react';
import {
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  XIcon,
} from 'lucide-react';
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';

export type ModelOption = { name: string; shortName?: string; value: string };

const ITEMS_PER_PAGE = 10;

function getProviderId(value: string): string {
  if (!value) return 'other';
  const idx = value.indexOf('/');
  return idx === -1 ? value : value.slice(0, idx) || 'other';
}

function getProviderLabel(id: string): string {
  switch (id) {
    case 'azure':
      return 'Azure';
    case 'anthropic':
      return 'Anthropic';
    case 'ollama-cloud':
      return 'Ollama Cloud';
    case 'webllm':
      return 'WebLLM';
    case 'transformer-browser':
      return 'Transformers.js';
    case 'browser':
      return 'Browser';
    case 'ollama':
      return 'Ollama';
    default:
      return 'Other';
  }
}

export interface ModelSelectorProps {
  models: ModelOption[];
  value: string;
  onValueChange: (value: string) => void;
  searchPlaceholder?: string;
  onOpenManageSheet?: () => void;
}

export function ModelSelector({
  models,
  value,
  onValueChange,
  searchPlaceholder = 'Search models...',
  onOpenManageSheet,
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredModels = useMemo(() => {
    if (!search.trim()) return models;
    const q = search.toLowerCase();
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.value.toLowerCase().includes(q),
    );
  }, [models, search]);

  const totalPages = Math.ceil(filteredModels.length / ITEMS_PER_PAGE);
  const safeCurrentPage =
    totalPages === 0 ? 1 : Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const visibleItems = filteredModels.slice(startIndex, endIndex);

  const handleSelect = (modelValue: string) => {
    onValueChange(modelValue);
    setOpen(false);
  };

  const handleClearSearch = () => {
    if (search.trim()) setSearch('');
  };

  const showClear = search.trim().length > 0;

  const selectedModel = useMemo(
    () => models.find((m) => m.value === value),
    [models, value],
  );
  const triggerLabel = selectedModel
    ? (selectedModel.shortName ?? selectedModel.name)
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="group hover:border-border/50 hover:bg-background/40 relative h-8 gap-2 rounded-md border border-transparent px-3 text-xs font-medium transition-all hover:backdrop-blur-sm"
        >
          <span
            className={cn(
              'min-w-0 truncate',
              triggerLabel ? 'text-foreground/80' : 'text-muted-foreground',
            )}
          >
            {triggerLabel ?? 'Select model'}
          </span>
          <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="border-border bg-popover z-[101] w-[340px] overflow-hidden rounded-lg border p-0 shadow-xl"
        align="start"
        sideOffset={8}
      >
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            className="h-8 border-none bg-transparent focus:ring-0"
            suffix={
              <div className="flex shrink-0 items-center gap-1 pr-1">
                {showClear && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleClearSearch();
                    }}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            }
          />
          <div className="max-h-[340px] overflow-x-hidden overflow-y-auto">
            <CommandList className="p-1">
              {visibleItems.length === 0 ? (
                <div className="py-6 text-center text-sm">
                  <span className="text-muted-foreground text-xs font-medium">
                    No models match your search
                  </span>
                </div>
              ) : (
                <CommandGroup>
                  {visibleItems.map((model) => {
                    const isSelected = value === model.value;
                    return (
                      <CommandItem
                        key={model.value}
                        value={model.value}
                        onSelect={() => handleSelect(model.value)}
                        className={cn(
                          'group relative flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors',
                          isSelected ? 'bg-accent/50' : 'hover:bg-muted/50',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                            isSelected
                              ? 'border-primary bg-primary'
                              : 'border-muted-foreground/30 group-hover:border-muted-foreground/60 bg-transparent',
                          )}
                        />
                        <div className="flex min-w-0 flex-1 flex-col">
                          <span
                            className={cn(
                              'truncate text-[11px] font-bold tracking-tight',
                              isSelected
                                ? 'text-foreground'
                                : 'text-foreground/80',
                            )}
                          >
                            {model.shortName ?? model.name}
                          </span>
                          <span className="text-muted-foreground truncate text-[9px] font-medium tracking-widest uppercase">
                            {getProviderLabel(getProviderId(model.value))}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </div>
          {onOpenManageSheet && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onOpenManageSheet();
              }}
              className="text-muted-foreground hover:bg-muted/50 hover:text-foreground border-border/40 flex w-full cursor-pointer items-center gap-3 border-t px-3 py-2 text-left text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4 shrink-0" />
              <span className="flex-1">Add model</span>
            </button>
          )}
          {totalPages > 1 && (
            <div className="border-border/40 bg-muted/20 flex items-center justify-between border-t px-3 py-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage((prev) => Math.max(1, prev - 1));
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-muted-foreground text-[10px] font-bold tracking-wider uppercase">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
