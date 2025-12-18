import { useEffect, useMemo, useRef, useState } from 'react';

import { Link, useNavigate } from 'react-router';

import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import {
  ArrowRight,
  LayoutGrid,
  List,
  Clock,
  User,
  Settings2,
  Check,
  Calendar,
  CaseSensitive,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import type { Datasource } from '@qwery/domain/entities';
import { getAllExtensionMetadata } from '@qwery/extensions-loader';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Kbd, KbdGroup } from '@qwery/ui/kbd';
import { Trans } from '@qwery/ui/trans';
import { DatasourceCard } from '@qwery/ui/qwery/datasource';
import { Switch } from '@qwery/ui/switch';
import { cn } from '@qwery/ui/utils';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@qwery/ui/table';
import { createDatasourceViewPath } from '~/config/project.navigation.config';

const ITEMS_PER_PAGE = 10;

type SortCriterion = 'date' | 'name';
type SortOrder = 'asc' | 'desc';

export function ListDatasources({
  datasources,
}: {
  datasources: Datasource[];
}) {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isMac = useMemo(
    () => navigator.platform.toUpperCase().indexOf('MAC') >= 0,
    [],
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGridView, setIsGridView] = useState(true);
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
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
    const filtered = datasources.filter((datasource) => {
      const matchesSearch =
        searchQuery === '' ||
        datasource.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        datasource.description
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortCriterion === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
    });
  }, [datasources, searchQuery, sortCriterion, sortOrder]);

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

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <span key={index} className="bg-[#ffcb51] text-black">
          {part}
        </span>
      ) : (
        part
      ),
    );
  };

  const handleSortClick = (criterion: SortCriterion) => {
    if (sortCriterion === criterion) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCriterion(criterion);
      setSortOrder('desc'); // Default to newest/desc when switching
    }
  };

  const handleSortOrderToggle = (checked: boolean) => {
    setSortOrder(checked ? 'desc' : 'asc');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 flex flex-col gap-6 p-6 lg:p-10 pb-4">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">
            <Trans
              i18nKey="datasources:list_title"
              defaults="Saved Datasources"
            />
          </h1>
        </div>

        <div className="flex flex-col gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search datasources..."
              className={cn(
                'pl-9 transition-all w-full h-11',
                shouldAnimate &&
                  'ring-primary animate-pulse ring-2 ring-offset-2',
              )}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredDatasources.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <div className="text-muted-foreground text-sm font-medium">
                <Trans
                  i18nKey="datasources:count_display"
                  defaults="Showing {{filtered}} of {{total}} datasources"
                  values={{
                    filtered: filteredDatasources.length,
                    total: datasources.length,
                  }}
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2 px-3">
                    <Settings2 className="h-3.5 w-3.5 text-muted-foreground/60" />
                    <span className="text-xs font-medium text-muted-foreground/60">Options</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                    Display Mode
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setIsGridView(true)}
                    className={cn(
                      'flex items-center justify-between cursor-pointer py-2.5 px-3',
                      isGridView && 'bg-[#ffcb51]/10 text-foreground font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <LayoutGrid className={cn('h-4 w-4', isGridView ? 'text-[#ffcb51]' : 'text-muted-foreground/40')} />
                      <span className="text-sm">Grid</span>
                    </div>
                    {isGridView && <Check className="h-4 w-4 text-[#ffcb51]" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setIsGridView(false)}
                    className={cn(
                      'flex items-center justify-between cursor-pointer py-2.5 px-3',
                      !isGridView && 'bg-[#ffcb51]/10 text-foreground font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <List className={cn('h-4 w-4', !isGridView ? 'text-[#ffcb51]' : 'text-muted-foreground/40')} />
                      <span className="text-sm">Table</span>
                    </div>
                    {!isGridView && <Check className="h-4 w-4 text-[#ffcb51]" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuLabel className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                    Sort By
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => handleSortClick('date')}
                    className={cn(
                      'flex items-center justify-between cursor-pointer py-2.5 px-3',
                      sortCriterion === 'date' && 'bg-[#ffcb51]/10 text-foreground font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Calendar className={cn('h-4 w-4', sortCriterion === 'date' ? 'text-[#ffcb51]' : 'text-muted-foreground/40')} />
                      <span className="text-sm">Date</span>
                    </div>
                    {sortCriterion === 'date' && (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={cn(
                            'text-[10px]',
                            sortOrder === 'asc'
                              ? 'text-[#ffcb51] font-bold'
                              : 'text-muted-foreground/40',
                          )}
                        >
                          ASC
                        </span>
                        <Switch
                          checked={sortOrder === 'desc'}
                          onCheckedChange={handleSortOrderToggle}
                          className="h-4 w-7 data-[state=checked]:bg-[#ffcb51] scale-75"
                        />
                        <span
                          className={cn(
                            'text-[10px]',
                            sortOrder === 'desc'
                              ? 'text-[#ffcb51] font-bold'
                              : 'text-muted-foreground/40',
                          )}
                        >
                          DESC
                        </span>
                      </div>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleSortClick('name')}
                    className={cn(
                      'flex items-center justify-between cursor-pointer py-2.5 px-3',
                      sortCriterion === 'name' && 'bg-[#ffcb51]/10 text-foreground font-medium',
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <CaseSensitive className={cn('h-4 w-4', sortCriterion === 'name' ? 'text-[#ffcb51]' : 'text-muted-foreground/40')} />
                      <span className="text-sm">Name</span>
                    </div>
                    {sortCriterion === 'name' && (
                      <div
                        className="flex items-center gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span
                          className={cn(
                            'text-[10px]',
                            sortOrder === 'asc'
                              ? 'text-[#ffcb51] font-bold'
                              : 'text-muted-foreground/40',
                          )}
                        >
                          ASC
                        </span>
                        <Switch
                          checked={sortOrder === 'desc'}
                          onCheckedChange={handleSortOrderToggle}
                          className="h-4 w-7 data-[state=checked]:bg-[#ffcb51] scale-75"
                        />
                        <span
                          className={cn(
                            'text-[10px]',
                            sortOrder === 'desc'
                              ? 'text-[#ffcb51] font-bold'
                              : 'text-muted-foreground/40',
                          )}
                        >
                          DESC
                        </span>
                      </div>
                    )}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-10 py-0">
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
        ) : isGridView ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedDatasources.map((datasource: Datasource) => {
              const logo = datasource.datasource_provider
                ? pluginLogoMap.get(datasource.datasource_provider)
                : undefined;

              return (
                <DatasourceCard
                  key={datasource.id}
                  id={datasource.id}
                  name={datasource.name}
                  createdAt={datasource.createdAt}
                  createdBy={datasource.createdBy}
                  logo={logo}
                  provider={datasource.datasource_provider}
                  viewButton={
                    <Link
                      to={createDatasourceViewPath(datasource.slug)}
                      className="flex w-full items-center justify-center gap-2 px-3 py-2"
                    >
                      <span className="text-foreground group-hover/btn:text-foreground text-xs font-medium transition-colors">
                        <Trans
                          i18nKey="datasources:card.view"
                          defaults="View"
                        />
                      </span>
                      <ArrowRight className="text-muted-foreground group-hover/btn:text-foreground h-3.5 w-3.5 transition-all group-hover/btn:translate-x-1" />
                    </Link>
                  }
                  data-test={`datasource-card-${datasource.id}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40%] font-semibold pl-6">Name</TableHead>
                  <TableHead className="font-semibold">Provider</TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSortClick('date')}
                      className="-ml-3 h-8 gap-1 px-3 hover:bg-transparent hover:text-foreground group/sort"
                    >
                      Created
                      {sortCriterion === 'date' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="ml-1 h-3.5 w-3.5 text-[#ffcb51]" />
                        ) : (
                          <ArrowDown className="ml-1 h-3.5 w-3.5 text-[#ffcb51]" />
                        )
                      ) : (
                        <ArrowUpDown className="ml-1 h-3.5 w-3.5 text-muted-foreground/30 group-hover/sort:text-muted-foreground" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="text-right font-semibold pr-6">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDatasources.map((datasource: Datasource) => {
                  const logo = datasource.datasource_provider
                    ? pluginLogoMap.get(datasource.datasource_provider)
                    : undefined;
                  const date = new Date(datasource.createdAt);
                  const formattedDate = date.toLocaleDateString();

                  return (
                    <TableRow
                      key={datasource.id}
                      className="group cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() =>
                        navigate(createDatasourceViewPath(datasource.slug))
                      }
                    >
                      <TableCell className="font-medium py-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/50 p-1.5 transition-colors group-hover:bg-background">
                            {logo ? (
                              <img
                                src={logo}
                                alt={datasource.datasource_provider}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="h-4 w-4 bg-muted-foreground/20 rounded" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                              {highlightMatch(datasource.name, searchQuery)}
                            </span>
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <User className="h-2.5 w-2.5" />
                              {datasource.createdBy || 'System'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                          {datasource.datasource_provider}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formattedDate}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(createDatasourceViewPath(datasource.slug));
                          }}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="sticky bottom-0 z-10 shrink-0 flex items-center justify-center border-t py-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goToPage(effectiveCurrentPage - 1)}
              disabled={effectiveCurrentPage === 1}
              className="h-9 gap-1 px-3"
            >
              <ChevronLeftIcon className="h-4 w-4" />
              <span>Previous</span>
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
                          className="text-muted-foreground select-none px-1"
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
                          : 'ghost'
                      }
                      size="sm"
                      onClick={() => goToPage(page)}
                      className={cn(
                        'h-9 w-9 p-0 font-medium',
                        effectiveCurrentPage === page
                          ? 'bg-[#ffcb51] text-black hover:bg-[#ffcb51]/90'
                          : 'hover:bg-accent',
                      )}
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
              className="h-9 gap-1 px-3"
            >
              <span>Next</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
