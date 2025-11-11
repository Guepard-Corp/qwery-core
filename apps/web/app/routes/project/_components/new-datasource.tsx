import { useEffect, useMemo, useRef, useState } from 'react';

import { Link, useParams } from 'react-router';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';

import { Badge } from '@qwery/ui/badge';
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

import { createDatasourcePath } from '~/config/project.navigation.config';

const ITEMS_PER_PAGE = 20;

type PluginMetadata = {
  id: string;
  name: string;
  description: string;
  logo: string;
  tags?: string[];
};

export function NewDatasource({
  datasources,
}: {
  datasources: PluginMetadata[];
}) {
  const params = useParams();
  const project_id = params.slug as string;
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(
    () => navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    [],
  );
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [shouldAnimate, setShouldAnimate] = useState(false);

  const filterTags = ['SQL', 'NoSQL', 'SaaS', 'Files'];

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

  const filteredDatasources = useMemo(() => {
    return datasources.filter((datasource) => {
      const matchesSearch =
        searchQuery === '' ||
        datasource.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        selectedFilters.size === 0 ||
        (datasource.tags &&
          datasource.tags.some((tag) => selectedFilters.has(tag)));

      return matchesSearch && matchesFilter;
    });
  }, [datasources, searchQuery, selectedFilters]);

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
              <Trans i18nKey="datasources:new_pageTitle" />
            </CardTitle>
            <CardDescription>
              <Trans i18nKey="datasources:new_pageSubtitle" />
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
          <div className="flex items-center gap-2">
            {filterTags.map((tag) => {
              const isSelected = selectedFilters.has(tag);
              return (
                <Badge
                  key={tag}
                  variant={isSelected ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-colors',
                    isSelected && 'hover:bg-primary/90',
                  )}
                  onClick={() => toggleFilter(tag)}
                >
                  {tag}
                </Badge>
              );
            })}
          </div>
          <div className="text-muted-foreground text-sm">
            <span className="font-medium">{filteredDatasources.length}</span>
            {' / '}
            <span>{datasources.length}</span>
          </div>
        </div>
      </div>
      <CardContent className="p-3">
        {filteredDatasources.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              You don&apos;t find a datasource
            </p>
            <p className="text-muted-foreground text-sm">
              <a
                href="https://github.com/guepard/qwery-studio/issues/new"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:text-primary/80 font-medium underline underline-offset-4 transition-colors"
              >
                Make a feature request here
              </a>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-3">
              {paginatedDatasources.map((datasource) => (
                <Link
                  key={datasource.id}
                  to={createDatasourcePath(project_id, datasource.id)}
                  className="hover:bg-accent/50 group flex cursor-pointer flex-col items-center gap-2 rounded-lg p-3 transition-all"
                >
                  {datasource.logo && (
                    <img
                      src={datasource.logo}
                      alt={datasource.name}
                      className="h-14 w-14 rounded object-contain transition-transform group-hover:scale-105"
                    />
                  )}
                  <h3 className="text-center text-sm leading-tight font-medium">
                    {datasource.name}
                  </h3>
                </Link>
              ))}
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
