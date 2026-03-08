'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ChevronDown, Check, Plus, X } from 'lucide-react';

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
import { Skeleton } from '../shadcn/skeleton';
import { cn, highlightSearchMatch } from '../lib/utils';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../shadcn/breadcrumb';
import { Input } from '../shadcn/input';

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
  // Optional inline title edit controls for the last breadcrumb item
  isEditingTitle?: boolean;
  editTitleValue?: string;
  onEditTitleChange?: (value: string) => void;
  onEditTitleSubmit?: () => void;
  onEditTitleCancel?: () => void;
}

interface NodeDropdownProps {
  config: BreadcrumbNodeConfig;
  loadingLabel?: string;
  isLast?: boolean;
}

export function NodeDropdown({
  config,
  loadingLabel = 'Loading...',
  noResultsLabel = 'No results found',
  isLast = false,
}: NodeDropdownProps & { noResultsLabel?: string }) {
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

  const isEditing = Boolean(config.isEditingTitle && isLast && current);
  const editValue = config.editTitleValue ?? current?.name ?? '';
  const trimmedEdit = editValue.trim();
  const canSave = !!trimmedEdit && trimmedEdit !== current?.name;
  const editInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  if (!current) {
    return <BreadcrumbPage>{loadingLabel}</BreadcrumbPage>;
  }

  return (
    <Popover
      open={isEditing ? false : open}
      onOpenChange={isEditing ? undefined : setOpen}
    >
      <PopoverTrigger asChild>
        {isEditing ? (
          <div
            className={cn(
              'group/breadcrumb-item relative flex items-center gap-1.5 rounded-md px-1 py-0.5',
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <Input
                ref={editInputRef}
                autoFocus
                value={editValue}
                onChange={(e) => config.onEditTitleChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (canSave) {
                      config.onEditTitleSubmit?.();
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    config.onEditTitleCancel?.();
                  }
                }}
                className="border-border bg-background focus-visible:ring-ring h-7 w-full min-w-0 flex-1 truncate rounded-md border px-2 text-sm font-semibold shadow-none focus-visible:ring-1"
              />
              <button
                type="button"
                onClick={() => {
                  if (canSave) {
                    config.onEditTitleSubmit?.();
                  }
                }}
                disabled={!canSave}
                aria-disabled={!canSave}
                className="flex size-6 items-center justify-center rounded text-emerald-500 transition-colors hover:bg-emerald-500/10 hover:text-emerald-700 disabled:text-emerald-500/40 disabled:hover:bg-transparent"
                aria-label="Confirm"
              >
                <Check className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => config.onEditTitleCancel?.()}
                className="text-muted-foreground hover:text-foreground hover:bg-accent flex size-6 items-center justify-center rounded transition-colors"
                aria-label="Cancel"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={cn(
              'group/breadcrumb-item relative flex items-center gap-1.5 rounded-md px-1 py-0.5',
              'hover:bg-muted/40 focus-visible:ring-ring cursor-pointer transition-colors focus-visible:ring-1 focus-visible:outline-none',
            )}
          >
            {current.icon && (
              <img
                src={current.icon}
                alt={current.name}
                className="h-4 w-4 shrink-0 rounded object-contain"
              />
            )}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <BreadcrumbPage className="truncate text-sm font-semibold">
                {current.name}
              </BreadcrumbPage>
              {isLast && (
                <ChevronDown className="text-muted-foreground/70 group-hover/breadcrumb-item:text-muted-foreground ml-1 h-3.5 w-3.5 shrink-0" />
              )}
            </div>
          </button>
        )}
      </PopoverTrigger>
      <PopoverContent
        className="border-border/50 z-[101] w-[340px] p-0 shadow-lg"
        align="start"
      >
        <Command className="rounded-lg">
          <div className="relative flex items-center border-b">
            <CommandInput
              placeholder={labels.search}
              value={search}
              onValueChange={setSearch}
              className="h-10 border-b-0 pr-10"
            />
            {onNew && (
              <button
                type="button"
                onClick={handleNew}
                className="text-muted-foreground hover:text-primary hover:bg-accent absolute right-2 flex size-6 cursor-pointer items-center justify-center rounded-md transition-colors"
                title={labels.new}
              >
                <Plus className="size-4" />
              </button>
            )}
          </div>
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
                      {noResultsLabel}
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
                                {highlightSearchMatch(item.name, search, {
                                  highlightClassName: 'bg-[#ffcb51]/40',
                                })}
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
            {!isLoading && onViewAll && (
              <div className="bg-muted/10 shrink-0 border-t">
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleViewAll}
                    className="hover:bg-accent cursor-pointer font-medium"
                  >
                    <span>{labels.viewAll}</span>
                  </CommandItem>
                </CommandGroup>
              </div>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
export interface GenericBreadcrumbProps {
  nodes: BreadcrumbNodeConfig[];
  loadingLabel?: string;
  noResultsLabel?: string;
}

export function GenericBreadcrumb({
  nodes,
  loadingLabel,
  noResultsLabel,
}: GenericBreadcrumbProps) {
  const visibleNodes = nodes.filter((node) => node.current !== null);

  if (visibleNodes.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="w-fit">
      <BreadcrumbList>
        {visibleNodes.flatMap((node, index) => {
          const isLast = index === visibleNodes.length - 1;
          return [
            ...(index > 0
              ? [
                  <BreadcrumbSeparator key={`sep-${node.current?.id ?? index}`}>
                    <ChevronRight className="h-4 w-4" />
                  </BreadcrumbSeparator>,
                ]
              : []),
            <BreadcrumbItem key={node.current?.id ?? index}>
              <NodeDropdown
                config={node}
                loadingLabel={loadingLabel}
                noResultsLabel={noResultsLabel}
                isLast={isLast}
              />
            </BreadcrumbItem>,
          ];
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}

export interface QweryBreadcrumbProps {
  hideOrganization?: boolean;
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
    type: 'datasource' | 'notebook' | 'conversation';
    isEditingTitle?: boolean;
    editTitleValue?: string;
    onEditTitleChange?: (value: string) => void;
    onEditTitleSubmit?: () => void;
    onEditTitleCancel?: () => void;
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
  onConversationSelect?: (conversation: BreadcrumbNodeItem) => void;
  onViewAllOrgs?: () => void;
  onViewAllProjects?: () => void;
  onViewAllDatasources?: () => void;
  onViewAllNotebooks?: () => void;
  onViewAllChats?: () => void;
  onNewOrg?: () => void;
  onNewProject?: () => void;
  onNewDatasource?: () => void;
  onNewNotebook?: () => void;
  onNewChat?: () => void;
  unsavedNotebookIds?: string[];
}

export function QweryBreadcrumb({
  hideOrganization = false,
  organization,
  project,
  object,
  onOrganizationSelect,
  onProjectSelect,
  onDatasourceSelect,
  onNotebookSelect,
  onConversationSelect,
  onViewAllOrgs,
  onViewAllProjects,
  onViewAllDatasources,
  onViewAllNotebooks,
  onViewAllChats,
  onNewOrg,
  onNewProject,
  onNewDatasource,
  onNewNotebook,
  unsavedNotebookIds = [],
}: QweryBreadcrumbProps) {
  const { t } = useTranslation('common');

  const nodes: BreadcrumbNodeConfig[] = [];

  if (organization && !hideOrganization) {
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

  // Object node (datasource, notebook, or conversation)
  if (object?.current) {
    const isNotebook = object.type === 'notebook';
    const isConversation = object.type === 'conversation';
    nodes.push({
      items: object.items,
      current: object.current,
      isLoading: object.isLoading,
      labels: {
        search: isNotebook
          ? t('breadcrumb.searchNotebooks')
          : isConversation
            ? t('breadcrumb.searchChats')
            : t('breadcrumb.searchDatasources'),
        viewAll: isNotebook
          ? t('breadcrumb.viewAllNotebooks')
          : isConversation
            ? t('breadcrumb.viewAllChats')
            : t('breadcrumb.viewAllDatasources'),
        new: isNotebook
          ? t('breadcrumb.newNotebook')
          : isConversation
            ? t('breadcrumb.newChat')
            : t('breadcrumb.newDatasource'),
      },
      onSelect: isNotebook
        ? (onNotebookSelect ?? (() => {}))
        : isConversation
          ? (onConversationSelect ?? (() => {}))
          : (onDatasourceSelect ?? (() => {})),
      onViewAll: isNotebook
        ? onViewAllNotebooks
        : isConversation
          ? onViewAllChats
          : onViewAllDatasources,
      // Chats shouldn't expose a "+" action in this dropdown header.
      onNew: isNotebook
        ? onNewNotebook
        : isConversation
          ? undefined
          : onNewDatasource,
      compareBy: isNotebook || isConversation ? 'id' : 'slug',
      renderBadge: isNotebook
        ? (item) =>
            unsavedNotebookIds.includes(item.id) ? (
              <span className="h-2 w-2 shrink-0 rounded-full border border-[#ffcb51]/50 bg-[#ffcb51] shadow-sm" />
            ) : null
        : undefined,
      isEditingTitle: object.isEditingTitle,
      editTitleValue: object.editTitleValue,
      onEditTitleChange: object.onEditTitleChange,
      onEditTitleSubmit: object.onEditTitleSubmit,
      onEditTitleCancel: object.onEditTitleCancel,
    });
  }

  return (
    <GenericBreadcrumb
      nodes={nodes}
      loadingLabel={t('breadcrumb.loading')}
      noResultsLabel={t('breadcrumb.noResults')}
    />
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
