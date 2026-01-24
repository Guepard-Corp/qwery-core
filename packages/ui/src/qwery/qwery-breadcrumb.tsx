'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronRight, ChevronsUpDown, Notebook, Check } from 'lucide-react';

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

export interface BreadcrumbNodeProps {
  items: BreadcrumbNodeItem[];
  isLoading: boolean;
  currentLabel: string;
  currentSlug?: string;
  currentId?: string;
  currentIcon?: string;
  searchPlaceholder: string;
  viewAllLabel: string;
  viewAllPath: string;
  newLabel: string;
  onSelect: (item: BreadcrumbNodeItem) => void;
  onViewAll: () => void;
  onNew: () => void;
  // Notebook-specific props
  isNotebook?: boolean;
  unsavedNotebookSlugs?: string[];
  maxVisibleItems?: number;
}

function BreadcrumbNodeDropdown({
  items,
  isLoading,
  currentLabel,
  currentSlug,
  currentId,
  currentIcon,
  searchPlaceholder,
  viewAllLabel,
  viewAllPath: _viewAllPath,
  newLabel,
  onSelect,
  onViewAll,
  onNew,
  isNotebook = false,
  unsavedNotebookSlugs = [],
  maxVisibleItems: _maxVisibleItems = 5,
}: BreadcrumbNodeProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [localUnsavedSlugs, setLocalUnsavedSlugs] = useState<string[]>([]);

  // Sync unsaved notebook slugs from localStorage for notebooks
  useEffect(() => {
    if (!isNotebook) return;

    const updateUnsavedSlugs = () => {
      try {
        const unsaved = JSON.parse(
          localStorage.getItem('notebook:unsaved') || '[]',
        ) as string[];
        setLocalUnsavedSlugs(unsaved);
      } catch {
        setLocalUnsavedSlugs([]);
      }
    };

    updateUnsavedSlugs();
    window.addEventListener('storage', updateUnsavedSlugs);
    const interval = setInterval(updateUnsavedSlugs, 500);
    return () => {
      window.removeEventListener('storage', updateUnsavedSlugs);
      clearInterval(interval);
    };
  }, [isNotebook]);

  // Use provided unsaved slugs or local ones
  const effectiveUnsavedSlugs = isNotebook
    ? unsavedNotebookSlugs.length > 0
      ? unsavedNotebookSlugs
      : localUnsavedSlugs
    : [];

  const filteredItems = useMemo(() => {
    if (!search.trim()) {
      return items;
    }
    const query = search.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.slug.toLowerCase().includes(query) ||
        item.id.toLowerCase().includes(query),
    );
  }, [items, search]);

  // Show all items (no limit)
  const visibleItems = filteredItems;

  const handleSelect = (item: BreadcrumbNodeItem) => {
    onSelect(item);
    setOpen(false);
    setSearch('');
  };

  const handleViewAll = () => {
    onViewAll();
    setOpen(false);
    setSearch('');
  };

  const handleNew = () => {
    onNew();
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="group/breadcrumb-item relative flex items-center">
      <div className="flex items-center gap-1.5">
        {currentIcon && (
          <img
            src={currentIcon}
            alt={currentLabel}
            className="h-4 w-4 shrink-0 object-contain rounded"
          />
        )}
        <BreadcrumbPage className="text-sm font-semibold">{currentLabel}</BreadcrumbPage>
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 cursor-pointer hover:bg-muted/50 rounded-md transition-colors"
          >
            <ChevronsUpDown className="h-3.5 w-3.5 text-muted-foreground/60" />
          </Button>
        </PopoverTrigger>
      <PopoverContent className="z-[101] w-[340px] p-0 shadow-lg border-border/50" align="start">
        <Command className="rounded-lg">
          <CommandInput
            placeholder={searchPlaceholder}
            value={search}
            onValueChange={setSearch}
            className="h-10 border-b"
          />
          <div className="flex max-h-[360px] flex-col">
            {/* Scrollable items list */}
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
                  {visibleItems.length > 0 && (
                    <CommandGroup>
                      {visibleItems.map((item) => {
                        // For notebooks, use ID for comparison; for others, use slug
                        const isCurrent = isNotebook
                          ? item.id === currentId
                          : item.slug === currentSlug;
                        const hasUnsavedChanges =
                          isNotebook &&
                          effectiveUnsavedSlugs.includes(item.slug);

                        return (
                          <CommandItem
                            key={item.id}
                            value={
                              isNotebook
                                ? item.id
                                : `${item.name} ${item.slug} ${item.id}`
                            }
                            onSelect={() => handleSelect(item)}
                            className={cn(
                              'cursor-pointer transition-colors',
                              isCurrent && 'bg-primary/10 text-primary font-medium',
                            )}
                          >
                            <div className="flex min-w-0 flex-1 items-center gap-2.5">
                              {/* Show notebook icon for notebooks, or custom icon if provided */}
                              {isNotebook ? (
                                <Notebook className="h-4 w-4 shrink-0 text-muted-foreground" />
                              ) : item.icon ? (
                                <img
                                  src={item.icon}
                                  alt={item.name}
                                  className="h-4 w-4 shrink-0 object-contain rounded"
                                />
                              ) : null}
                              <span className="truncate text-sm">{item.name}</span>
                              {hasUnsavedChanges && (
                                <span className="h-2 w-2 shrink-0 rounded-full border border-[#ffcb51]/50 bg-[#ffcb51] shadow-sm" />
                              )}
                              {isCurrent && (
                                <Check className="h-4 w-4 shrink-0 text-primary ml-auto" />
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
            {/* Fixed footer with View All and New options */}
            {!isLoading && (
              <div className="shrink-0 border-t bg-muted/10">
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleViewAll}
                    className="cursor-pointer font-medium hover:bg-accent"
                  >
                    <span>{viewAllLabel}</span>
                  </CommandItem>
                </CommandGroup>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem 
                    onSelect={handleNew} 
                    className="cursor-pointer font-medium hover:bg-accent text-primary"
                  >
                    <span className="mr-2 text-lg">+</span>
                    <span>{newLabel}</span>
                  </CommandItem>
                </CommandGroup>
              </div>
            )}
          </div>
        </Command>
      </PopoverContent>
    </Popover>
    </div>
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
  labels: {
    searchOrgs: string;
    searchProjects: string;
    searchDatasources: string;
    searchNotebooks: string;
    viewAllOrgs: string;
    viewAllProjects: string;
    viewAllDatasources: string;
    viewAllNotebooks: string;
    newOrg: string;
    newProject: string;
    newDatasource: string;
    newNotebook: string;
    loading: string;
  };
  paths: {
    viewAllOrgs: string;
    viewAllProjects: string;
    viewAllDatasources: string;
    viewAllNotebooks: string;
  };
  onOrganizationSelect: (org: BreadcrumbNodeItem) => void;
  onProjectSelect: (project: BreadcrumbNodeItem) => void;
  onDatasourceSelect: (datasource: BreadcrumbNodeItem) => void;
  onNotebookSelect: (notebook: BreadcrumbNodeItem) => void;
  onViewAllOrgs: () => void;
  onViewAllProjects: () => void;
  onViewAllDatasources: () => void;
  onViewAllNotebooks: () => void;
  onNewOrg: () => void;
  onNewProject: () => void;
  onNewDatasource: () => void;
  onNewNotebook: () => void;
  unsavedNotebookSlugs?: string[];
}

export function QweryBreadcrumb({
  organization,
  project,
  object,
  labels,
  paths,
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
  // Support organization-only mode (for organization pages)
  if (!organization?.current) {
    return null;
  }
  
  // If no project, show only organization breadcrumb
  if (!project?.current) {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            {organization.current ? (
              <BreadcrumbNodeDropdown
                items={organization.items}
                isLoading={organization.isLoading}
                currentLabel={organization.current.name}
                currentSlug={organization.current.slug}
                searchPlaceholder={labels.searchOrgs}
                viewAllLabel={labels.viewAllOrgs}
                viewAllPath={paths.viewAllOrgs}
                newLabel={labels.newOrg}
                onSelect={onOrganizationSelect}
                onViewAll={onViewAllOrgs}
                onNew={onNewOrg}
              />
            ) : (
              <BreadcrumbPage>{labels.loading}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    );
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {/* Organization */}
        <BreadcrumbItem>
          {organization.current ? (
            <BreadcrumbNodeDropdown
              items={organization.items}
              isLoading={organization.isLoading}
              currentLabel={organization.current.name}
              currentSlug={organization.current.slug}
              searchPlaceholder={labels.searchOrgs}
              viewAllLabel={labels.viewAllOrgs}
              viewAllPath={paths.viewAllOrgs}
              newLabel={labels.newOrg}
              onSelect={onOrganizationSelect}
              onViewAll={onViewAllOrgs}
              onNew={onNewOrg}
            />
          ) : (
            <BreadcrumbPage>{labels.loading}</BreadcrumbPage>
          )}
        </BreadcrumbItem>

        <BreadcrumbSeparator>
          <ChevronRight className="h-4 w-4" />
        </BreadcrumbSeparator>

        {/* Project */}
        <BreadcrumbItem>
          {project.current ? (
            <BreadcrumbNodeDropdown
              items={project.items}
              isLoading={project.isLoading}
              currentLabel={project.current.name}
              currentSlug={project.current.slug}
              searchPlaceholder={labels.searchProjects}
              viewAllLabel={labels.viewAllProjects}
              viewAllPath={paths.viewAllProjects}
              newLabel={labels.newProject}
              onSelect={onProjectSelect}
              onViewAll={onViewAllProjects}
              onNew={onNewProject}
            />
          ) : (
            <BreadcrumbPage>{labels.loading}</BreadcrumbPage>
          )}
        </BreadcrumbItem>

        {/* Object (Datasource or Notebook) */}
        {object?.current && (
          <>
            <BreadcrumbSeparator>
              <ChevronRight className="h-4 w-4" />
            </BreadcrumbSeparator>
            <BreadcrumbItem>
              {object.type === 'datasource' ? (
                <BreadcrumbNodeDropdown
                  items={object.items}
                  isLoading={object.isLoading}
                  currentLabel={object.current.name}
                  currentSlug={object.current.slug}
                  currentIcon={object.current.icon}
                  searchPlaceholder={labels.searchDatasources}
                  viewAllLabel={labels.viewAllDatasources}
                  viewAllPath={paths.viewAllDatasources}
                  newLabel={labels.newDatasource}
                  onSelect={onDatasourceSelect}
                  onViewAll={onViewAllDatasources}
                  onNew={onNewDatasource}
                />
              ) : (
                <BreadcrumbNodeDropdown
                  items={object.items}
                  isLoading={object.isLoading}
                  currentLabel={object.current.name}
                  currentSlug={object.current.slug}
                  currentId={object.current.id}
                  currentIcon={object.current.icon}
                  searchPlaceholder={labels.searchNotebooks}
                  viewAllLabel={labels.viewAllNotebooks}
                  viewAllPath={paths.viewAllNotebooks}
                  newLabel={labels.newNotebook}
                  onSelect={onNotebookSelect}
                  onViewAll={onViewAllNotebooks}
                  onNew={onNewNotebook}
                  isNotebook={true}
                  unsavedNotebookSlugs={unsavedNotebookSlugs}
                  maxVisibleItems={5}
                />
              )}
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
