import { useEffect, useMemo, useRef, useState } from 'react';

import { useNavigate, useParams } from 'react-router';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { toast } from 'sonner';

import type { Playground } from '@qwery/domain/entities';
import { Button } from '@qwery/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@qwery/ui/card';
import { Input } from '@qwery/ui/input';
import { Kbd, KbdGroup } from '@qwery/ui/kbd';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

import pathsConfig from '~/config/paths.config';
import { createPath } from '~/config/qwery.navigation.config';
import { useWorkspace } from '~/lib/context/workspace-context';
import { usePlayground } from '~/lib/mutations/use-playground';
import { useGetProjectBySlug } from '~/lib/queries/use-get-projects';

const ITEMS_PER_PAGE = 20;

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
  const isMac = useMemo(
    () => navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Load project to get projectId
  const project = useGetProjectBySlug(projectRepository, project_id);

  // Mutation to create playground
  const createPlaygroundMutation = usePlayground(
    repositories.datasource,
    () => {
      toast.success('Playground created successfully');
      navigate(createPath(pathsConfig.app.projectNotebook, project_id));
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

  // Reset to page 1 when filtered results change
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
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle>
              <Trans
                i18nKey="playgrounds:list_title"
                defaults="Saved Playgrounds"
              />
            </CardTitle>
            <CardDescription>
              <Trans
                i18nKey="playgrounds:list_subtitle"
                defaults="Create prefilled databases to test the product"
              />
            </CardDescription>
          </div>
          <div className="relative w-64">
            <MagnifyingGlassIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search..."
              className={cn(
                'pr-20 pl-9 transition-all',
                shouldAnimate &&
                  'ring-primary animate-pulse ring-2 ring-offset-2',
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute top-1/2 right-3 -translate-y-1/2">
              <KbdGroup>
                <Kbd>{isMac ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>F</Kbd>
              </KbdGroup>
            </div>
          </div>
        </div>
      </CardHeader>
      <div className="border-b px-4 pb-2">
        <div className="flex items-center justify-between gap-4">
          <div className="text-muted-foreground text-sm">
            <span className="font-medium">{filteredPlaygrounds.length}</span>
            {' / '}
            <span>{playgrounds.length}</span>
            {' playgrounds'}
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        {filteredPlaygrounds.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              No playgrounds found
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'No playgrounds available'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedPlaygrounds.map((playground) => {
                return (
                  <Card
                    key={playground.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {playground.logo && (
                          <img
                            src={playground.logo}
                            alt={playground.name}
                            className="h-10 w-10 flex-shrink-0 rounded object-contain"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {playground.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-col gap-2">
                        <p className="text-muted-foreground text-sm">
                          {playground.description}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleCreate(playground.id)}
                          disabled={
                            createPlaygroundMutation.isPending ||
                            !project.data?.id
                          }
                        >
                          {createPlaygroundMutation.isPending
                            ? 'Creating...'
                            : 'Create'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-between border-t pt-2">
                <div className="text-muted-foreground text-sm">
                  Showing {startIndex + 1} to{' '}
                  {Math.min(endIndex, filteredPlaygrounds.length)} of{' '}
                  {filteredPlaygrounds.length} playgrounds
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(effectiveCurrentPage - 1)}
                    disabled={effectiveCurrentPage === 1}
                  >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
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
                                className="text-muted-foreground px-2"
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
                            variant={
                              effectiveCurrentPage === page
                                ? 'default'
                                : 'outline'
                            }
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="min-w-[2.5rem]"
                          >
                            {page}
                          </Button>
                        );
                      },
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => goToPage(effectiveCurrentPage + 1)}
                    disabled={effectiveCurrentPage === totalPages}
                  >
                    Next
                    <ChevronRightIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
