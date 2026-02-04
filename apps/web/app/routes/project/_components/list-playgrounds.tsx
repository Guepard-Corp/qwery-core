import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import {
  ArrowRight,
  Command,
  Database,
  InfoIcon,
  LayoutTemplate,
  Terminal,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Playground } from '@qwery/domain/entities';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@qwery/ui/tooltip';
import { cn } from '@qwery/ui/utils';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { usePlayground } from '~/lib/mutations/use-playground';
import { useGetProjectBySlug } from '~/lib/queries/use-get-projects';

const ITEMS_PER_PAGE = 9;

export function ListPlaygrounds({
  playgrounds,
}: {
  playgrounds: Playground[];
}) {
  const { t } = useTranslation(['playgrounds']);
  const params = useParams();
  const project_id = params.slug as string;
  const navigate = useNavigate();
  const { repositories } = useWorkspace();
  const projectRepository = repositories.project;
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Load project to get projectId
  const project = useGetProjectBySlug(projectRepository, project_id);

  const createPlaygroundMutation = usePlayground(
    repositories.datasource,
    () => {
      toast.success('Playground created successfully');
      navigate(createPath(pathsConfig.app.projectDatasources, project_id), {
        replace: true,
      });
    },
    (error) => {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create playground',
      );
    },
  );

  const handleCreate = (playgroundId: string) => {
    createPlaygroundMutation.mutate({
      playgroundId,
      projectId: project.data?.id as string,
    });
  };

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const filteredPlaygrounds = useMemo(() => {
    return playgrounds.filter((playground) => {
      const matchesSearch =
        searchQuery === '' ||
        playground.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        playground.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [playgrounds, searchQuery]);

  const effectiveCurrentPage = useMemo(() => {
    const totalPages = Math.ceil(filteredPlaygrounds.length / ITEMS_PER_PAGE);
    return currentPage > totalPages ? 1 : currentPage;
  }, [filteredPlaygrounds.length, currentPage]);

  const totalPages = Math.ceil(filteredPlaygrounds.length / ITEMS_PER_PAGE);
  const startIndex = (effectiveCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedPlaygrounds = filteredPlaygrounds.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <TooltipProvider>
      <div className="w-full px-8 py-8 lg:px-16">
        {/* SECTION 1: HERO & SEARCH 
        Centered layout for a "Marketplace" feel.
      */}
        <div className="mb-12 flex flex-col items-center text-center">
          <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
            <LayoutTemplate className="h-6 w-6" />
          </div>

          <h1 className="text-foreground mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
            {t('playgrounds:title')}
          </h1>

          <p className="text-muted-foreground mb-8 max-w-xl text-lg leading-relaxed">
            {t('playgrounds:description')}
          </p>

          <div
            className={cn(
              'bg-muted/30 border-border/50 focus-within:border-border flex h-14 w-full max-w-2xl items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent',
              isSearchFocused && 'ring-2 ring-[#ffcb51] ring-offset-2',
            )}
          >
            <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('playgrounds:search_placeholder')}
              className="h-full flex-1 border-0 bg-transparent p-0 text-base shadow-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* SECTION 2: GRID CONTENT
         */}
        <div className="min-h-[400px]">
          {filteredPlaygrounds.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="bg-muted mb-4 rounded-lg p-4">
                <Command className="text-muted-foreground h-8 w-8 opacity-50" />
              </div>
              <h3 className="text-foreground text-lg font-medium">
                {t('playgrounds:empty_title')}
              </h3>
              <p className="text-muted-foreground mt-1 text-sm">
                {t('playgrounds:empty_subtitle')}
              </p>
              <Button
                variant="link"
                onClick={() => setSearchQuery('')}
                className="text-primary mt-2"
              >
                Clear search
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {paginatedPlaygrounds.map((playground) => (
                  <div
                    key={playground.id}
                    onClick={() => handleCreate(playground.id)}
                    className="group hover:!bg-sidebar hover:border-primary hover:shadow-primary/5 relative flex w-full cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-2xl"
                  >
                    <div className="flex flex-row items-start gap-4 p-6">
                      <div className="bg-muted group-hover:bg-primary group-hover:text-primary-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border transition-all duration-300">
                        {playground.logo ? (
                          <img
                            src={playground.logo}
                            alt={playground.name}
                            className="h-6 w-6 object-contain"
                          />
                        ) : (
                          <Terminal className="h-6 w-6 transition-colors" />
                        )}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <div className="text-foreground truncate text-lg font-bold tracking-tight transition-colors">
                              {playground.name}
                            </div>
                            <p className="text-muted-foreground/80 line-clamp-2 text-sm leading-relaxed">
                              {playground.description}
                            </p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <InfoIcon className="h-4 w-4" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              sideOffset={12}
                              className="bg-popover text-popover-foreground border-border/60 max-w-sm overflow-hidden rounded-lg border-2 p-0 shadow-xl backdrop-blur-sm"
                            >
                              <div className="bg-primary/5 border-border/50 border-b px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div className="bg-primary/20 text-primary border-primary/30 flex h-7 w-7 items-center justify-center rounded-lg border shadow-sm">
                                    <Database className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <div className="text-sm font-semibold">
                                      Available Data
                                    </div>
                                    <div className="text-muted-foreground mt-0.5 text-[10px]">
                                      3 tables with sample data
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2.5 p-4">
                                <div className="group/item flex items-start gap-2.5">
                                  <div className="bg-primary/10 text-primary border-primary/20 group-hover/item:bg-primary/20 mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold transition-colors">
                                    U
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-primary font-mono text-xs font-bold">
                                        users
                                      </span>
                                      <span className="text-muted-foreground/60 text-[10px]">
                                        • 5 rows
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                      User accounts with basic information
                                    </div>
                                  </div>
                                </div>
                                <div className="group/item flex items-start gap-2.5">
                                  <div className="bg-primary/10 text-primary border-primary/20 group-hover/item:bg-primary/20 mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold transition-colors">
                                    P
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-primary font-mono text-xs font-bold">
                                        products
                                      </span>
                                      <span className="text-muted-foreground/60 text-[10px]">
                                        • 8 rows
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                      Product catalog with pricing and inventory
                                    </div>
                                  </div>
                                </div>
                                <div className="group/item flex items-start gap-2.5">
                                  <div className="bg-primary/10 text-primary border-primary/20 group-hover/item:bg-primary/20 mt-0.5 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-bold transition-colors">
                                    O
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-primary font-mono text-xs font-bold">
                                        orders
                                      </span>
                                      <span className="text-muted-foreground/60 text-[10px]">
                                        • 8 rows
                                      </span>
                                    </div>
                                    <div className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                                      Customer orders with status tracking
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="bg-muted/30 border-border/50 border-t px-4 py-2.5">
                                <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                                  <div className="bg-primary/40 h-1.5 w-1.5 rounded-full"></div>
                                  <span>
                                    Includes sample data and query examples
                                  </span>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-6 pt-0">
                      <div className="text-muted-foreground/70 text-[10px] font-medium">
                        Ready to deploy
                      </div>
                      <div className="text-primary flex items-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-12 flex items-center justify-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(effectiveCurrentPage - 1)}
                    disabled={effectiveCurrentPage === 1}
                    className="border-muted-foreground/20 rounded-md"
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                  </Button>
                  <span className="text-muted-foreground min-w-[100px] text-center text-sm font-medium">
                    {t('common:pageOfPages', {
                      page: effectiveCurrentPage,
                      total: totalPages,
                    })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPage(effectiveCurrentPage + 1)}
                    disabled={effectiveCurrentPage === totalPages}
                    className="border-muted-foreground/20 rounded-md"
                  >
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
