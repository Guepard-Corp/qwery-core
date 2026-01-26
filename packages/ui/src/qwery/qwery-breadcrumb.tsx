'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronsUpDown, Check } from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '../shadcn/command';
import { Popover, PopoverContent, PopoverTrigger } from '../shadcn/popover';
import { Button } from '../shadcn/button';
import { Skeleton } from '../shadcn/skeleton';
import { cn } from '../lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../shadcn/breadcrumb';

export interface BreadcrumbNodeItem {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

export interface BreadcrumbNodeConfig {
  items: BreadcrumbNodeItem[];
  current: BreadcrumbNodeItem | null;
  isLoading?: boolean;
  labels: {
    search: string;
    viewAll: string;
    new: string;
  };
  onSelect: (item: BreadcrumbNodeItem) => void;
  onViewAll?: () => void;
  onNew?: () => void;
  renderIcon?: (item: BreadcrumbNodeItem) => ReactNode;
  renderBadge?: (item: BreadcrumbNodeItem) => ReactNode;
  compareBy?: 'id' | 'slug';
}

interface NodeDropdownProps {
  config: BreadcrumbNodeConfig;
  loadingLabel?: string;
}

function NodeDropdown({
  config,
  loadingLabel = 'Loading...',
}: NodeDropdownProps) {
  const {
    items,
    current,
    isLoading = false,
    labels,
    onSelect,
    onViewAll,
    onNew,
    renderIcon,
    renderBadge,
    compareBy = 'slug',
  } = config;

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query),
    );
  }, [items, search]);

  const handleSelect = (item: BreadcrumbNodeItem) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  const handleViewAll = () => {
    onViewAll?.();
    setOpen(false);
    setSearch('');
  };

  const handleNew = () => {
    onNew?.();
    setOpen(false);
    setSearch('');
  };

  if (!current) {
    return <BreadcrumbPage>{loadingLabel}</BreadcrumbPage>;
  }

  return (
    <div className="group/breadcrumb-item relative flex items-center">
      <div className="flex items-center gap-1.5">
        {current.icon && (
          <img
            src={current.icon}
            alt={current.name}
            className="h-4 w-4 shrink-0 rounded object-contain"
          />
        )}
        <BreadcrumbPage className="text-sm font-semibold">
          {current.name}
        </BreadcrumbPage>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted/50 h-6 w-6 cursor-pointer rounded-md transition-colors"
          >
            <ChevronsUpDown className="text-muted-foreground/60 h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="border-border/50 z-[101] w-[340px] p-0 shadow-lg"
          align="start"
        >
          <Command className="rounded-lg">
            <CommandInput
              placeholder={labels.search}
              value={search}
              onValueChange={setSearch}
              className="h-10 border-b"
            />
            <div className="flex max-h-[360px] flex-col">
              <CommandList className="min-h-0 flex-1 overflow-y-auto">
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
                        No results found
                      </span>
                    </CommandEmpty>
                    {filteredItems.length > 0 && (
                      <CommandGroup>
                        {filteredItems.map((item) => {
                          const isCurrent =
                            compareBy === 'id'
                              ? item.id === current.id
                              : item.slug === current.slug;

                          return (
                            <CommandItem
                              key={item.id}
                              value={`${item.name} ${item.slug} ${item.id}`}
                              onSelect={() => handleSelect(item)}
                              className={cn(
                                'cursor-pointer transition-colors',
                                isCurrent &&
                                  'bg-primary/10 text-primary font-medium',
                              )}
                            >
                              <div className="flex min-w-0 flex-1 items-center gap-2.5">
                                {renderIcon?.(item) ??
                                  (item.icon && (
                                    <img
                                      src={item.icon}
                                      alt={item.name}
                                      className="h-4 w-4 shrink-0 rounded object-contain"
                                    />
                                  ))}
                                <span className="truncate text-sm">
                                  {item.name}
                                </span>
                                {renderBadge?.(item)}
                                {isCurrent && (
                                  <Check className="text-primary ml-auto h-4 w-4 shrink-0" />
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}
                  </>
                )}
              </CommandList>
              {!isLoading && (onViewAll || onNew) && (
                <div className="bg-muted/10 shrink-0 border-t">
                  {onViewAll && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleViewAll}
                          className="hover:bg-accent cursor-pointer font-medium"
                        >
                          <span>{labels.viewAll}</span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                  {onNew && (
                    <>
                      <CommandSeparator />
                      <CommandGroup>
                        <CommandItem
                          onSelect={handleNew}
                          className="hover:bg-accent text-primary cursor-pointer font-medium"
                        >
                          <span className="mr-2 text-lg">+</span>
                          <span>{labels.new}</span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </div>
              )}
            </div>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
export interface GenericBreadcrumbProps {
  nodes: BreadcrumbNodeConfig[];
  loadingLabel?: string;
}

export function GenericBreadcrumb({
  nodes,
  loadingLabel,
}: GenericBreadcrumbProps) {
  const visibleNodes = nodes.filter((node) => node.current !== null);

  if (visibleNodes.length === 0) {
    return null;
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {visibleNodes.map((node, index) => (
          <BreadcrumbItem key={node.current?.id ?? index}>
            {index > 0 && (
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
            )}
            <NodeDropdown config={node} loadingLabel={loadingLabel} />
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export interface QweryBreadcrumbProps {
  organization?: {
    items: BreadcrumbNodeItem[];
    isLoading: boolean;
    current: BreadcrumbNodeItem | null;
  };
  project?: {
    items: BreadcrumbNodeItem[];
    isLoading: boolean;
    current: BreadcrumbNodeItem | null;
  };
  object?: {
    items: BreadcrumbNodeItem[];
    isLoading: boolean;
    current: BreadcrumbNodeItem | null;
    type: 'datasource' | 'notebook';
  };
  paths?: {
    viewAllOrgs?: string;
    viewAllProjects?: string;
    viewAllDatasources?: string;
    viewAllNotebooks?: string;
  };
  onOrganizationSelect: (org: BreadcrumbNodeItem) => void;
  onProjectSelect?: (project: BreadcrumbNodeItem) => void;
  onDatasourceSelect?: (datasource: BreadcrumbNodeItem) => void;
  onNotebookSelect?: (notebook: BreadcrumbNodeItem) => void;
  onViewAllOrgs?: () => void;
  onViewAllProjects?: () => void;
  onViewAllDatasources?: () => void;
  onViewAllNotebooks?: () => void;
  onNewOrg?: () => void;
  onNewProject?: () => void;
  onNewDatasource?: () => void;
  onNewNotebook?: () => void;
  unsavedNotebookSlugs?: string[];
}

export function QweryBreadcrumb({
  organization,
  project,
  object,
  onOrganizationSelect,
  onProjectSelect,
  onDatasourceSelect,
  onNotebookSelect,
  onViewAllOrgs,
  onViewAllProjects,
  onViewAllDatasources,
  onViewAllNotebooks,
  onNewOrg,
  onNewProject,
  onNewDatasource,
  onNewNotebook,
  unsavedNotebookSlugs = [],
}: QweryBreadcrumbProps) {
  const { t } = useTranslation('common');

  const nodes: BreadcrumbNodeConfig[] = [];

  // Organization node
  if (organization) {
    nodes.push({
      items: organization.items,
      current: organization.current,
      isLoading: organization.isLoading,
      labels: {
        search: t('breadcrumb.searchOrgs'),
        viewAll: t('breadcrumb.viewAllOrgs'),
        new: t('breadcrumb.newOrg'),
      },
      onSelect: onOrganizationSelect,
      onViewAll: onViewAllOrgs,
      onNew: onNewOrg,
    });
  }

  // Project node
  if (project?.current) {
    nodes.push({
      items: project.items,
      current: project.current,
      isLoading: project.isLoading,
      labels: {
        search: t('breadcrumb.searchProjects'),
        viewAll: t('breadcrumb.viewAllProjects'),
        new: t('breadcrumb.newProject'),
      },
      onSelect: onProjectSelect ?? (() => {}),
      onViewAll: onViewAllProjects,
      onNew: onNewProject,
    });
  }

  // Object node (datasource or notebook)
  if (object?.current) {
    const isNotebook = object.type === 'notebook';
    nodes.push({
      items: object.items,
      current: object.current,
      isLoading: object.isLoading,
      labels: {
        search: isNotebook
          ? t('breadcrumb.searchNotebooks')
          : t('breadcrumb.searchDatasources'),
        viewAll: isNotebook
          ? t('breadcrumb.viewAllNotebooks')
          : t('breadcrumb.viewAllDatasources'),
        new: isNotebook
          ? t('breadcrumb.newNotebook')
          : t('breadcrumb.newDatasource'),
      },
      onSelect: isNotebook
        ? (onNotebookSelect ?? (() => {}))
        : (onDatasourceSelect ?? (() => {})),
      onViewAll: isNotebook ? onViewAllNotebooks : onViewAllDatasources,
      onNew: isNotebook ? onNewNotebook : onNewDatasource,
      compareBy: isNotebook ? 'id' : 'slug',
      renderBadge: isNotebook
        ? (item) =>
            unsavedNotebookSlugs.includes(item.slug) ? (
              <span className="h-2 w-2 shrink-0 rounded-full border border-[#ffcb51]/50 bg-[#ffcb51] shadow-sm" />
            ) : null
        : undefined,
    });
  }

  return (
    <GenericBreadcrumb nodes={nodes} loadingLabel={t('breadcrumb.loading')} />
  );
}

export function useBreadcrumbNode(config: {
  items: BreadcrumbNodeItem[];
  current: BreadcrumbNodeItem | null;
  isLoading?: boolean;
  labels: { search: string; viewAll: string; new: string };
  onSelect: (item: BreadcrumbNodeItem) => void;
  onViewAll?: () => void;
  onNew?: () => void;
}): BreadcrumbNodeConfig {
  return config;
}
