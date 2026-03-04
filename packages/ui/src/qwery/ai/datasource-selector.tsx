'use client';

import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  Check,
  Database,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  XIcon,
} from 'lucide-react';
import { sortByModifiedDesc } from '@qwery/shared/utils';

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover';
import { Button } from '../../shadcn/button';
import { Skeleton } from '../../shadcn/skeleton';
import { cn } from '../../lib/utils';
import { Trans } from '../trans';
import { useTranslation } from 'react-i18next';

export interface DatasourceItem {
  id: string;
  name: string;
  slug: string;
  datasource_provider: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface DatasourceSelectorProps {
  selectedDatasources: string[]; // Array of datasource IDs
  onSelectionChange: (datasourceIds: string[]) => void;
  datasources: DatasourceItem[];
  pluginLogoMap: Map<string, string>; // Maps datasource_provider to icon URL
  isLoading?: boolean;
  searchPlaceholder?: string;
  variant?: 'default' | 'badge';
  readOnly?: boolean;
}

const ITEMS_PER_PAGE = 10;

export function DatasourceSelector({
  selectedDatasources,
  onSelectionChange,
  datasources,
  pluginLogoMap,
  isLoading = false,
  searchPlaceholder,
  variant = 'default',
  readOnly = false,
}: DatasourceSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [displayOrderIds, setDisplayOrderIds] = useState<string[]>([]);
  const prevOpenRef = useRef(false);

  const placeholderText =
    searchPlaceholder ||
    t('common:datasourceSelector.searchDatasources', {
      defaultValue: 'Search datasources...',
    });

  const orderIdsForOpen = useMemo(() => {
    const selected = datasources.filter((ds) =>
      selectedDatasources.includes(ds.id),
    );
    const unselected = datasources.filter(
      (ds) => !selectedDatasources.includes(ds.id),
    );
    return [
      ...sortByModifiedDesc(selected).map((ds) => ds.id),
      ...sortByModifiedDesc(unselected).map((ds) => ds.id),
    ];
  }, [datasources, selectedDatasources]);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setTimeout(() => {
        setDisplayOrderIds(orderIdsForOpen);
      }, 0);
    }
    prevOpenRef.current = open;
  }, [open, orderIdsForOpen]);

  const filteredAndSortedDatasources = useMemo(() => {
    let filtered = datasources;

    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = datasources.filter(
        (ds) =>
          ds.name.toLowerCase().includes(query) ||
          ds.slug.toLowerCase().includes(query) ||
          ds.datasource_provider.toLowerCase().includes(query),
      );
    }

    const orderIds =
      displayOrderIds.length > 0 ? displayOrderIds : orderIdsForOpen;
    if (orderIds.length === 0) return sortByModifiedDesc(filtered);

    const orderIndex = new Map(orderIds.map((id, i) => [id, i]));
    return [...filtered].sort((a, b) => {
      const ia = orderIndex.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const ib = orderIndex.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      return ia - ib;
    });
  }, [datasources, search, displayOrderIds, orderIdsForOpen]);

  const totalPages = Math.ceil(
    filteredAndSortedDatasources.length / ITEMS_PER_PAGE,
  );
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const visibleItems = filteredAndSortedDatasources.slice(startIndex, endIndex);

  useEffect(() => {
    if (open || search) {
      setTimeout(() => {
        setCurrentPage(1);
      }, 0);
    }
  }, [open, search]);

  const handleImageError = useCallback((datasourceId: string) => {
    setFailedImages((prev) => new Set(prev).add(datasourceId));
  }, []);

  const handleToggle = (datasourceId: string) => {
    const isSelected = selectedDatasources.includes(datasourceId);
    if (isSelected) {
      onSelectionChange(
        selectedDatasources.filter((id) => id !== datasourceId),
      );
    } else {
      onSelectionChange([...selectedDatasources, datasourceId]);
    }
  };

  const handleClearSearchOrSelection = () => {
    if (search.trim()) {
      setSearch('');
    } else if (selectedDatasources.length > 0) {
      onSelectionChange([]);
    }
  };

  const showClear = search.trim().length > 0 || selectedDatasources.length > 0;

  // Get display info based on selection
  const displayInfo = useMemo(() => {
    if (selectedDatasources.length === 0) {
      return {
        type: 'empty' as const,
        label: 'common:datasourceSelector.selectDatasources',
      };
    }

    if (selectedDatasources.length === 1) {
      const selected = datasources.find(
        (ds) => ds.id === selectedDatasources[0],
      );
      if (selected) {
        const icon = pluginLogoMap.get(selected.datasource_provider);
        return {
          type: 'single' as const,
          label: selected.name,
          icon,
          provider: selected.datasource_provider,
        };
      }
    }

    return {
      type: 'multiple' as const,
      count: selectedDatasources.length,
    };
  }, [selectedDatasources, datasources, pluginLogoMap]);

  const renderTriggerContent = (showChevron = true) => (
    <>
      {displayInfo.type === 'empty' && (
        <>
          <Database className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          <span className="text-muted-foreground min-w-0 truncate text-xs font-medium">
            <Trans i18nKey={displayInfo.label} defaults="Select datasources" />
          </span>
          {showChevron && (
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </>
      )}

      {displayInfo.type === 'single' && (
        <>
          {displayInfo.icon &&
          !failedImages.has(selectedDatasources[0] ?? '') ? (
            <img
              src={displayInfo.icon}
              alt={displayInfo.label}
              className={cn(
                'h-3.5 w-3.5 shrink-0 object-contain',
                displayInfo.provider === 'json-online' && 'dark:invert',
              )}
              onError={() => {
                if (selectedDatasources[0]) {
                  handleImageError(selectedDatasources[0]);
                }
              }}
            />
          ) : (
            <Database className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <span className="text-foreground/80 min-w-0 truncate text-xs font-medium">
            {displayInfo.label}
          </span>
          {showChevron && (
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </>
      )}

      {displayInfo.type === 'multiple' && (
        <>
          <Database className="text-primary/80 h-3.5 w-3.5 shrink-0" />
          <span className="text-foreground/90 min-w-0 truncate text-xs font-bold">
            {displayInfo.count} datasources
          </span>
          {showChevron && (
            <ChevronsUpDown className="h-3 w-3 shrink-0 opacity-50" />
          )}
        </>
      )}
    </>
  );

  if (readOnly) {
    return (
      <div
        className={cn(
          'border-border bg-background/40 flex h-7 max-w-full min-w-0 cursor-default items-center gap-2 rounded-md border px-2.5 text-xs backdrop-blur-md transition-all',
          variant !== 'badge' && 'h-8 px-3',
        )}
      >
        {renderTriggerContent(false)}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'badge' ? (
          <div
            className="group border-border/50 bg-background/40 ring-offset-background hover:border-border hover:bg-background/80 relative flex h-7 max-w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border px-2.5 text-xs backdrop-blur-sm transition-all hover:shadow-sm active:scale-95"
            role="button"
            tabIndex={0}
          >
            {renderTriggerContent()}
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="group hover:border-border/50 hover:bg-background/40 relative h-8 gap-2 rounded-md border border-transparent px-3 text-xs font-medium transition-all hover:backdrop-blur-sm"
          >
            {renderTriggerContent()}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="border-border bg-popover z-[101] w-[260px] overflow-hidden rounded-lg border p-0 shadow-xl"
        align="start"
        sideOffset={8}
      >
        <Command shouldFilter={false} className="bg-transparent">
          <CommandInput
            placeholder={placeholderText}
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
                      handleClearSearchOrSelection();
                    }}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            }
          />
          <CommandList className="max-h-[260px] overflow-x-hidden overflow-y-auto p-1">
            {isLoading ? (
              <div className="space-y-1.5 p-2">
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-full rounded" />
                <Skeleton className="h-8 w-full rounded" />
              </div>
            ) : (
              <>
                {visibleItems.length === 0 && (
                  <div className="py-6 text-center text-sm">
                    <Database className="mx-auto mb-2 h-6 w-6 opacity-20" />
                    <span className="text-muted-foreground text-xs font-medium">
                      <Trans
                        i18nKey="common:datasourceSelector.noDatasourcesFound"
                        defaults="No datasources found"
                      />
                    </span>
                  </div>
                )}
                {visibleItems.length > 0 && (
                  <CommandGroup>
                    {visibleItems.map((datasource) => {
                      const isSelected = selectedDatasources.includes(
                        datasource.id,
                      );
                      const icon = pluginLogoMap.get(
                        datasource.datasource_provider,
                      );
                      const hasFailed = failedImages.has(datasource.id);
                      const showIcon = icon && !hasFailed;

                      return (
                        <CommandItem
                          key={datasource.id}
                          value={datasource.id}
                          onSelect={(value) => handleToggle(value)}
                          className={cn(
                            'group relative flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors',
                            isSelected ? 'bg-accent/50' : 'hover:bg-muted/50',
                          )}
                        >
                          <div
                            className={cn(
                              'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-sm border-2 transition-all',
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/30 group-hover:border-muted-foreground/60 bg-transparent',
                            )}
                          >
                            {isSelected && (
                              <Check className="h-2.5 w-2.5" strokeWidth={3} />
                            )}
                          </div>
                          <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
                            {showIcon ? (
                              <img
                                src={icon}
                                alt=""
                                className={cn(
                                  'h-4 w-4 object-contain transition-transform group-hover:scale-110',
                                  datasource.datasource_provider ===
                                    'json-online' && 'dark:invert',
                                )}
                                onError={() => handleImageError(datasource.id)}
                              />
                            ) : (
                              <Database className="text-muted-foreground h-3 w-3" />
                            )}
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <span
                              className={cn(
                                'truncate text-[11px] font-bold tracking-tight',
                                isSelected
                                  ? 'text-foreground'
                                  : 'text-foreground/80',
                              )}
                            >
                              {datasource.name}
                            </span>
                            <span className="text-muted-foreground truncate text-[9px] font-medium tracking-widest uppercase">
                              {datasource.datasource_provider.replace(
                                /_/g,
                                ' ',
                              )}
                            </span>
                          </div>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
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
                <Trans
                  i18nKey="common:pageOfPages"
                  defaults="Page {{page}} / {{total}}"
                  values={{ page: currentPage, total: totalPages }}
                />
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
