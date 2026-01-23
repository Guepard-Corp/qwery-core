'use client';

import { useMemo, useState, useCallback, useEffect } from 'react';
import { Database, ChevronsUpDown, ChevronLeft, ChevronRight } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../../shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '../../shadcn/popover';
import { Button } from '../../shadcn/button';
import { Skeleton } from '../../shadcn/skeleton';
import { Checkbox } from '../../shadcn/checkbox';
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
}

const ITEMS_PER_PAGE = 10;

export function DatasourceSelector({
  selectedDatasources,
  onSelectionChange,
  datasources,
  pluginLogoMap,
  isLoading = false,
  searchPlaceholder,
}: DatasourceSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  
  const placeholderText = searchPlaceholder || t('common:datasourceSelector.searchDatasources', { defaultValue: 'Search datasources...' });

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
    
    return [...filtered].sort((a, b) => {
      const aTime = a.updatedAt?.getTime() || a.createdAt?.getTime() || 0;
      const bTime = b.updatedAt?.getTime() || b.createdAt?.getTime() || 0;
      return bTime - aTime;
    });
  }, [datasources, search]);

  const totalPages = Math.ceil(filteredAndSortedDatasources.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const visibleItems = filteredAndSortedDatasources.slice(startIndex, endIndex);

  useEffect(() => {
    if (open || search) {
      setCurrentPage(1);
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
        };
      }
    }

    return {
      type: 'multiple' as const,
      count: selectedDatasources.length,
    };
  }, [selectedDatasources, datasources, pluginLogoMap]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-xs font-normal"
        >
          {displayInfo.type === 'empty' && (
            <>
              <Database className="text-muted-foreground h-3.5 w-3.5" />
              <span className="text-muted-foreground">
                <Trans i18nKey={displayInfo.label} defaults="Select datasources" />
              </span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </>
          )}

          {displayInfo.type === 'single' && (
            <>
              {displayInfo.icon &&
              !failedImages.has(selectedDatasources[0] ?? '') ? (
                <img
                  src={displayInfo.icon}
                  alt={displayInfo.label}
                  className="h-3.5 w-3.5 shrink-0 object-contain"
                  onError={() => {
                    if (selectedDatasources[0]) {
                      handleImageError(selectedDatasources[0]);
                    }
                  }}
                />
              ) : (
                <Database className="h-3.5 w-3.5" />
              )}
              <span className="truncate">{displayInfo.label}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </>
          )}

          {displayInfo.type === 'multiple' && (
            <>
              <Database className="h-3.5 w-3.5 text-green-600" />
              <span className="truncate">x {displayInfo.count}</span>
              <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="z-[101] w-[300px] p-0 overflow-x-hidden" align="start">
        <Command>
          <CommandInput
            placeholder={placeholderText}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="overflow-x-hidden">
            {isLoading ? (
              <div className="p-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="mt-2 h-8 w-full" />
                <Skeleton className="mt-2 h-8 w-full" />
              </div>
            ) : (
              <>
                <CommandEmpty>
                  <span className="text-muted-foreground text-sm">
                    <Trans i18nKey="common:datasourceSelector.noDatasourcesFound" defaults="No datasources found" />
                  </span>
                </CommandEmpty>
                {visibleItems.length > 0 && (
                  <CommandGroup className="overflow-x-hidden">
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
                          onSelect={() => handleToggle(datasource.id)}
                          className={cn(
                            'cursor-pointer overflow-x-hidden',
                            isSelected && 'bg-accent text-accent-foreground',
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            className="mr-2"
                            onCheckedChange={() => handleToggle(datasource.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {showIcon ? (
                            <img
                              src={icon}
                              alt={datasource.name}
                              className="mr-2 h-4 w-4 shrink-0 object-contain"
                              onError={() => handleImageError(datasource.id)}
                            />
                          ) : (
                            <Database className="text-muted-foreground mr-2 h-4 w-4 shrink-0" />
                          )}
                          <span className="truncate">{datasource.name}</span>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                )}
              </>
            )}
          </CommandList>
          {totalPages > 1 && (
            <div className="border-t bg-muted p-2 flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage((prev) => Math.max(1, prev - 1));
                }}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="text-muted-foreground text-xs font-medium">
                <Trans 
                  i18nKey="common:pageOfPages" 
                  defaults="Page {{page}} of {{total}}"
                  values={{ page: currentPage, total: totalPages }}
                />
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                }}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
