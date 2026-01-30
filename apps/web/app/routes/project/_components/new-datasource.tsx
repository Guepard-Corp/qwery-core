import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useParams } from 'react-router';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { Database, ArrowRight, Sparkles, X } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import { DatasourceConnectSheet } from './datasource-connect-sheet';

const ITEMS_PER_PAGE = 24;

type PluginMetadata = {
  id: string;
  name: string;
  description: string;
  logo: string;
  tags: string[];
};

export function NewDatasource({
  datasources,
}: {
  datasources: PluginMetadata[];
}) {
  const params = useParams();
  const project_id = params.slug as string;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Set<string>>(new Set());
  const [orderOverride, setOrderOverride] = useState<string[] | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDatasource, setSelectedDatasource] = useState<{
    id: string;
    name: string;
    logo: string;
    description: string;
  } | null>(null);

  const filterTags = ['SQL', 'Files', 'SaaS', 'API'];

  const openDrawerFor = useCallback((ds: PluginMetadata) => {
    setSelectedDatasource({
      id: ds.id,
      name: ds.name,
      logo: ds.logo,
      description: ds.description,
    });
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setShouldAnimate(true);
        searchInputRef.current?.focus();

        setTimeout(() => setShouldAnimate(false), 1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleFilter = (tag: string) => {
    setOrderOverride(null);
    setSelectedFilters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const clearSearch = () => {
    setSearchQuery('');
    setOrderOverride(null);
    searchInputRef.current?.focus();
  };

  const filteredDatasources = useMemo(() => {
    return datasources.filter((datasource) => {
      const matchesSearch =
        searchQuery === '' ||
        datasource.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        selectedFilters.size === 0 ||
        datasource.tags.some((tag) => selectedFilters.has(tag));

      return matchesSearch && matchesFilter;
    });
  }, [datasources, searchQuery, selectedFilters]);

  const orderedDatasources = useMemo(() => {
    if (!orderOverride || orderOverride.length !== filteredDatasources.length) {
      return filteredDatasources;
    }
    const byId = new Map(filteredDatasources.map((d) => [d.id, d]));
    return orderOverride
      .map((id) => byId.get(id))
      .filter((d): d is PluginMetadata => d != null);
  }, [filteredDatasources, orderOverride]);

  const effectiveCurrentPage = useMemo(() => {
    const totalPages = Math.ceil(orderedDatasources.length / ITEMS_PER_PAGE);
    return currentPage > totalPages ? 1 : currentPage;
  }, [orderedDatasources.length, currentPage]);

  const totalPages = Math.ceil(orderedDatasources.length / ITEMS_PER_PAGE);
  const startIndex = (effectiveCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDatasources = orderedDatasources.slice(startIndex, endIndex);

  const handleDragStart = useCallback(
    (e: React.DragEvent, pageIndex: number) => {
      setDraggingIndex(pageIndex);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(startIndex + pageIndex));
    },
    [startIndex],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, dropPageIndex: number) => {
      e.preventDefault();
      setDraggingIndex(null);
      const dragGlobalIndex = parseInt(
        e.dataTransfer.getData('text/plain'),
        10,
      );
      if (Number.isNaN(dragGlobalIndex)) return;
      const dropGlobalIndex = startIndex + dropPageIndex;
      if (dragGlobalIndex === dropGlobalIndex) return;
      const ids = orderedDatasources.map((d) => d.id);
      const a = Math.min(dragGlobalIndex, dropGlobalIndex);
      const b = Math.max(dragGlobalIndex, dropGlobalIndex);
      if (a < 0 || b >= ids.length) return;
      const next = [...ids];
      const tmp = next[a];
      const target = next[b];
      if (tmp === undefined || target === undefined) return;
      next[a] = target;
      next[b] = tmp;
      setOrderOverride(next);
    },
    [orderedDatasources, startIndex],
  );

  const handleDragEnd = useCallback(() => {
    setDraggingIndex(null);
  }, []);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleLogoError = useCallback((datasourceId: string) => {
    setFailedLogos((prev) => new Set(prev).add(datasourceId));
  }, []);

  const isJsonDatasource = (id: string) => id.toLowerCase().includes('json');

  return (
    <div className="flex h-full flex-col">
      <div className="border-border/40 bg-background/95 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="px-8 py-6">
          <div className="flex flex-col gap-5">
            <div>
              <h1 className="text-foreground text-2xl font-semibold tracking-tight">
                <Trans i18nKey="datasources:new_pageTitle" />
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                <Trans i18nKey="datasources:new_pageSubtitle" />
              </p>
            </div>

            <div
              className={cn(
                'bg-muted/30 border-border/50 focus-within:border-border flex h-12 w-full items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent',
                shouldAnimate && 'ring-2 ring-[#ffcb51] ring-offset-2',
              )}
            >
              <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
              <Input
                ref={searchInputRef}
                type="text"
                placeholder="Search datasources..."
                className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOrderOverride(null);
                }}
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <div className="bg-border/50 mx-2 h-6 w-px" />
              <div className="flex items-center gap-2">
                {filterTags.map((tag) => {
                  const isSelected = selectedFilters.has(tag);
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleFilter(tag)}
                      className={cn(
                        'relative cursor-pointer rounded-md px-3 py-1 text-xs font-medium transition-all duration-200',
                        isSelected
                          ? 'bg-[#ffcb51] text-black shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      {tag}
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-sm transition-transform hover:scale-110">
                          <X className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filteredDatasources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="bg-muted/30 mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
              <Database className="text-muted-foreground/50 h-8 w-8" />
            </div>
            <h3 className="text-foreground mb-2 text-lg font-medium">
              No datasources found
            </h3>
            <p className="text-muted-foreground mb-6 max-w-sm text-sm">
              We couldn&apos;t find any datasources matching your criteria. Try
              adjusting your filters or search.
            </p>
            <a
              href="https://github.com/guepard/qwery-studio/issues/new"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-[#ffcb51] transition-colors hover:text-[#ffcb51]/80"
            >
              <Sparkles className="h-4 w-4" />
              Request a new datasource
              <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {paginatedDatasources.map((datasource, index) => {
                const hasFailed = failedLogos.has(datasource.id);
                const showLogo = datasource.logo && !hasFailed;
                const shouldInvert = isJsonDatasource(datasource.id);
                const isDragging = draggingIndex === index;

                return (
                  <div
                    key={datasource.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'cursor-grab transition-opacity active:cursor-grabbing',
                      isDragging && 'opacity-50',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openDrawerFor(datasource)}
                      className="group relative flex w-full cursor-pointer flex-col items-center rounded-xl p-5 text-left transition-all duration-200 hover:bg-[#ffcb51]/5"
                    >
                      <div className="bg-muted/40 group-hover:bg-muted/60 mb-4 flex h-20 w-20 items-center justify-center rounded-2xl transition-all duration-200 group-hover:scale-105">
                        {showLogo ? (
                          <img
                            src={datasource.logo}
                            alt={datasource.name}
                            className={cn(
                              'h-12 w-12 object-contain',
                              shouldInvert && 'dark:invert',
                            )}
                            onError={() => handleLogoError(datasource.id)}
                          />
                        ) : (
                          <Database className="text-muted-foreground/60 h-9 w-9" />
                        )}
                      </div>
                      <span className="text-foreground text-center text-base leading-tight font-medium">
                        {datasource.name}
                      </span>
                      <div className="text-muted-foreground/0 group-hover:text-muted-foreground/60 mt-1.5 flex items-center gap-1 text-xs transition-all duration-200">
                        <span>Connect</span>
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className="border-border/40 mt-8 flex items-center justify-center border-t pt-6">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToPage(effectiveCurrentPage - 1)}
                    disabled={effectiveCurrentPage === 1}
                    className="h-9 cursor-pointer gap-1 px-3 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Previous</span>
                  </Button>
                  <div className="flex items-center gap-1 px-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => {
                        const showPage =
                          page === 1 ||
                          page === totalPages ||
                          (page >= effectiveCurrentPage - 1 &&
                            page <= effectiveCurrentPage + 1);

                        if (!showPage) {
                          if (
                            page === effectiveCurrentPage - 2 ||
                            page === effectiveCurrentPage + 2
                          ) {
                            return (
                              <span
                                key={page}
                                className="text-muted-foreground/40 px-1"
                              >
                                ...
                              </span>
                            );
                          }
                          return null;
                        }

                        return (
                          <Button
                            key={page}
                            variant="ghost"
                            size="sm"
                            onClick={() => goToPage(page)}
                            className={cn(
                              'h-9 w-9 cursor-pointer p-0 font-medium',
                              effectiveCurrentPage === page
                                ? 'bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90'
                                : 'hover:bg-muted',
                            )}
                          >
                            {page}
                          </Button>
                        );
                      },
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => goToPage(effectiveCurrentPage + 1)}
                    disabled={effectiveCurrentPage === totalPages}
                    className="h-9 cursor-pointer gap-1 px-3 disabled:cursor-not-allowed"
                  >
                    <span className="hidden sm:inline">Next</span>
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedDatasource && (
        <DatasourceConnectSheet
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          extensionId={selectedDatasource.id}
          projectSlug={project_id}
          extensionMeta={{
            name: selectedDatasource.name,
            logo: selectedDatasource.logo,
            description: selectedDatasource.description,
          }}
          onSuccess={closeDrawer}
          onCancel={closeDrawer}
        />
      )}
    </div>
  );
}
