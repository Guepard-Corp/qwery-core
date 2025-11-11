import { useEffect, useMemo, useRef, useState } from 'react';

import { Link } from 'react-router';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import type { Datasource } from '@qwery/domain/entities';
import { getAllExtensionMetadata } from '@qwery/extensions-sdk';
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

import { createDatasourceViewPath } from '~/config/project.navigation.config';

const ITEMS_PER_PAGE = 20;

export function ListDatasources({
  datasources,
}: {
  datasources: Datasource[];
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(
    () => navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  // Fetch all plugin metadata to get logos
  const { data: pluginMetadata = [] } = useQuery({
    queryKey: ['all-plugin-metadata'],
    queryFn: () => getAllExtensionMetadata(),
    staleTime: 60 * 1000,
  });

  // Create a map of provider ID -> logo
  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    pluginMetadata.forEach((plugin) => {
      map.set(plugin.id, plugin.logo);
    });
    return map;
  }, [pluginMetadata]);

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

  const filteredDatasources = useMemo(() => {
    return datasources.filter((datasource) => {
      const matchesSearch =
        searchQuery === '' ||
        datasource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        datasource.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [datasources, searchQuery]);

  // Reset to page 1 when filtered results change
  const effectiveCurrentPage = useMemo(() => {
    const totalPages = Math.ceil(filteredDatasources.length / ITEMS_PER_PAGE);
    return currentPage > totalPages ? 1 : currentPage;
  }, [filteredDatasources.length, currentPage]);

  const totalPages = Math.ceil(filteredDatasources.length / ITEMS_PER_PAGE);
  const startIndex = (effectiveCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDatasources = filteredDatasources.slice(startIndex, endIndex);

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
                i18nKey="datasources:list_title"
                defaults="Saved Datasources"
              />
            </CardTitle>
            <CardDescription>
              <Trans
                i18nKey="datasources:list_subtitle"
                defaults="Manage your connected datasources"
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
            <span className="font-medium">{filteredDatasources.length}</span>
            {' / '}
            <span>{datasources.length}</span>
            {' datasources'}
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        {filteredDatasources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              No datasources found
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'No datasources have been created yet'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {paginatedDatasources.map((datasource: Datasource) => {
                const logo = datasource.datasource_provider
                  ? pluginLogoMap.get(datasource.datasource_provider)
                  : undefined;

                return (
                  <Card
                    key={datasource.id}
                    className="hover:bg-accent/50 transition-colors"
                  >
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        {logo && (
                          <img
                            src={logo}
                            alt={datasource.name}
                            className="h-10 w-10 flex-shrink-0 rounded object-contain"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <CardTitle className="truncate text-base">
                            {datasource.name}
                          </CardTitle>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-muted-foreground flex flex-col gap-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span>Created</span>
                          <span>{format(datasource.createdAt, 'PP')}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Updated</span>
                          <span>{format(datasource.updatedAt, 'PP')}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          asChild
                        >
                          <Link to={createDatasourceViewPath(datasource.slug)}>
                            View
                          </Link>
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
                  {Math.min(endIndex, filteredDatasources.length)} of{' '}
                  {filteredDatasources.length} datasources
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
