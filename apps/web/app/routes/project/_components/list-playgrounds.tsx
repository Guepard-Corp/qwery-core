import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';

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
        playground.description.toLowerCase().includes(searchQuery.toLowerCase());
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
      <div className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
      {/* SECTION 1: HERO & SEARCH 
        Centered layout for a "Marketplace" feel.
      */}
      <div className="mb-12 flex flex-col items-center text-center">
        <div className="bg-primary/10 text-primary mb-4 flex h-12 w-12 items-center justify-center rounded-lg">
          <LayoutTemplate className="h-6 w-6" />
        </div>
        
        <h1 className="text-foreground mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Start with a Template
        </h1>
        
        <p className="text-muted-foreground mb-8 max-w-xl text-lg leading-relaxed">
          Choose a pre-configured playground to jumpstart your project. 
          Includes schema, sample data, and query examples.
        </p>

        <div className={cn(
          "relative w-full max-w-2xl transition-all duration-200 ease-in-out",
          isSearchFocused ? "scale-105" : "scale-100"
        )}>
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
            <MagnifyingGlassIcon className="text-muted-foreground h-5 w-5" />
          </div>
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="Search templates..."
            className="bg-background border-muted placeholder:text-muted-foreground/60 h-14 rounded-lg border-2 pl-12 pr-4 text-base shadow-sm transition-colors focus-visible:ring-0 focus-visible:border-primary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
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
            <h3 className="text-foreground text-lg font-medium">No playgrounds found</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              We couldn't find a template matching "{searchQuery}"
            </p>
            <Button 
              variant="link" 
              onClick={() => setSearchQuery('')}
              className="mt-2 text-primary"
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
                  className="group bg-card hover:border-primary/50 relative flex flex-col rounded-lg border p-6 text-left transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
                >
                  {/* Card Header */}
                  <div className="mb-5 flex items-start justify-between">
                    <div className="bg-muted/30 flex h-14 w-14 items-center justify-center rounded-md border p-2">
                      {playground.logo ? (
                        <img
                          src={playground.logo}
                          alt={playground.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <Terminal className="text-primary h-6 w-6" />
                      )}
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <InfoIcon className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        sideOffset={12}
                        className="bg-popover text-popover-foreground border-border/60 max-w-sm rounded-lg border-2 shadow-xl backdrop-blur-sm p-0 overflow-hidden"
                      >
                        <div className="bg-primary/5 border-b border-border/50 px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="bg-primary/20 text-primary flex h-7 w-7 items-center justify-center rounded-lg border border-primary/30 shadow-sm">
                              <Database className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-sm">Available Data</div>
                              <div className="text-muted-foreground text-[10px] mt-0.5">3 tables with sample data</div>
                            </div>
                          </div>
                        </div>
                        <div className="p-4 space-y-2.5">
                          <div className="flex items-start gap-2.5 group/item">
                            <div className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-primary/20 text-[10px] font-bold group-hover/item:bg-primary/20 transition-colors">
                              U
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-primary font-mono font-bold text-xs">users</span>
                                <span className="text-muted-foreground/60 text-[10px]">• 5 rows</span>
                              </div>
                              <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">User accounts with basic information</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 group/item">
                            <div className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-primary/20 text-[10px] font-bold group-hover/item:bg-primary/20 transition-colors">
                              P
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-primary font-mono font-bold text-xs">products</span>
                                <span className="text-muted-foreground/60 text-[10px]">• 8 rows</span>
                              </div>
                              <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">Product catalog with pricing and inventory</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2.5 group/item">
                            <div className="bg-primary/10 text-primary mt-0.5 flex h-5 w-5 items-center justify-center rounded border border-primary/20 text-[10px] font-bold group-hover/item:bg-primary/20 transition-colors">
                              O
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-primary font-mono font-bold text-xs">orders</span>
                                <span className="text-muted-foreground/60 text-[10px]">• 8 rows</span>
                              </div>
                              <div className="text-muted-foreground text-xs mt-0.5 leading-relaxed">Customer orders with status tracking</div>
                            </div>
                          </div>
                        </div>
                        <div className="bg-muted/30 border-t border-border/50 px-4 py-2.5">
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <div className="h-1.5 w-1.5 rounded-full bg-primary/40"></div>
                            <span>Includes sample data and query examples</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Card Content */}
                  <div className="flex-1 space-y-2">
                    <h3 className="text-foreground text-xl font-semibold tracking-tight">
                      {playground.name}
                    </h3>
                    <p className="text-muted-foreground line-clamp-3 text-sm leading-relaxed">
                      {playground.description}
                    </p>
                  </div>

                  {/* Card Footer / Action */}
                  <div className="mt-6 flex items-center justify-between pt-4">
                    <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                      Ready to deploy
                    </div>
                    <Button
                      onClick={() => handleCreate(playground.id)}
                      disabled={createPlaygroundMutation.isPending}
                      size="sm"
                      className="rounded-md px-5 transition-transform active:scale-95"
                    >
                      {createPlaygroundMutation.isPending ? 'Creating...' : 'Select'}
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </Button>
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
                  className="rounded-md border-muted-foreground/20"
                >
                  <ChevronLeftIcon className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground min-w-[100px] text-center text-sm font-medium">
                  Page {effectiveCurrentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => goToPage(effectiveCurrentPage + 1)}
                  disabled={effectiveCurrentPage === totalPages}
                  className="rounded-md border-muted-foreground/20"
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