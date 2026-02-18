import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
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
  ChevronDown,
  ChevronRight,
  Layers,
  Plus,
  X,
  Play,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Datasource } from '@qwery/domain/entities';
import type { PlaygroundSuggestion } from '@qwery/playground/playground-suggestions';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { DatasourceCard } from '@qwery/ui/qwery/datasource';
import { Switch } from '@qwery/ui/switch';
import { cn } from '@qwery/ui/utils';
import { formatRelativeTime } from '@qwery/ui/ai';

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
import pathsConfig, { createPath } from '~/config/paths.config';
import { PlaygroundConfirmDialog } from './playground-confirm-dialog';
import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { usePlayground } from '~/lib/mutations/use-playground';
import { useGetDatasourceExtensions } from '~/lib/queries/use-get-extension';
import { getErrorKey } from '~/lib/utils/error-key';

const ITEMS_PER_PAGE = 10;

type SortCriterion = 'date' | 'name';
type SortOrder = 'asc' | 'desc';

export function ListDatasources({
  datasources,
}: {
  datasources: Datasource[];
}) {
  const { t } = useTranslation('common');
  const params = useParams();
  const projectSlug = params.slug as string;
  const navigate = useNavigate();
  const { projectId } = useProject();
  const { repositories } = useWorkspace();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGridView, setIsGridView] = useState(true);
  const [groupByProvider, setGroupByProvider] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] =
    useState<PlaygroundSuggestion | null>(null);

  const createPlaygroundMutation = usePlayground(
    repositories.datasource,
    () => {},
    (error) => {
      toast.error(getErrorKey(error, t), { id: 'creating-playground' });
    },
  );

  const handleOpenPlaygroundConfirm = () => {
    setSelectedSuggestion(null);
    setShowConfirmDialog(true);
  };

  const handleConfirmPlayground = async () => {
    if (!projectId) return;

    setShowConfirmDialog(false);
    toast.loading('Creating playground...', { id: 'creating-playground' });

    try {
      const playgroundDatasource = await createPlaygroundMutation.mutateAsync({
        playgroundId: 'pglite',
        projectId,
      });

      toast.dismiss('creating-playground');
      toast.success('Playground created');
      setTimeout(() => {
        navigate(createDatasourceViewPath(playgroundDatasource.slug));
      }, 600);
    } catch (error) {
      toast.error(getErrorKey(error, t), { id: 'creating-playground' });
    }
  };

  // Fetch all extensions metadata to get logos
  const { data: extensions = [] } = useGetDatasourceExtensions();

  // Create a map of provider ID -> logo
  // TODO: is this needed ?
  const pluginLogoMap = useMemo(() => {
    const map = new Map<string, string>();
    extensions.forEach((plugin) => {
      map.set(plugin.id, plugin.icon);
    });
    return map;
  }, [extensions]);

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

  const groupedDatasources = useMemo(() => {
    if (!groupByProvider) return {};

    const groups = filteredDatasources.reduce(
      (acc, datasource) => {
        const provider = datasource.datasource_provider || 'Other';
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider]!.push(datasource);
        return acc;
      },
      {} as Record<string, Datasource[]>,
    );

    return groups;
  }, [filteredDatasources, groupByProvider]);

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

  const toggleGroupCollapse = (provider: string) => {
    setCollapsedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      return newSet;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-6 px-8 py-6 lg:px-16 lg:py-10">
        <h1 className="text-3xl font-bold">
          <Trans
            i18nKey="datasources:list_title"
            defaults="Saved Datasources"
          />
        </h1>

        <div className="flex items-center gap-3">
          <div
            className={cn(
              'bg-muted/30 border-border/50 focus-within:border-border flex h-12 flex-1 items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent',
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer rounded-full p-1 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hover:bg-muted h-8 shrink-0 gap-2 border-none px-2 focus-visible:ring-0"
                >
                  <Settings2 className="text-muted-foreground/60 h-4 w-4" />
                  <span className="text-muted-foreground/60 text-xs font-medium">
                    Options
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="text-muted-foreground/30 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase">
                  Display Mode
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsGridView(true)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2.5',
                    isGridView && 'text-foreground bg-[#ffcb51]/10 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <LayoutGrid
                      className={cn(
                        'h-4 w-4',
                        isGridView
                          ? 'text-[#ffcb51]'
                          : 'text-muted-foreground/40',
                      )}
                    />
                    <span className="text-sm">Grid</span>
                  </div>
                  {isGridView && <Check className="h-4 w-4 text-[#ffcb51]" />}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsGridView(false)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2.5',
                    !isGridView &&
                      'text-foreground bg-[#ffcb51]/10 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <List
                      className={cn(
                        'h-4 w-4',
                        !isGridView
                          ? 'text-[#ffcb51]'
                          : 'text-muted-foreground/40',
                      )}
                    />
                    <span className="text-sm">Table</span>
                  </div>
                  {!isGridView && <Check className="h-4 w-4 text-[#ffcb51]" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuLabel className="text-muted-foreground/30 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase">
                  Group By
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setGroupByProvider(!groupByProvider)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2.5',
                    groupByProvider &&
                      'text-foreground bg-[#ffcb51]/10 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Layers
                      className={cn(
                        'h-4 w-4',
                        groupByProvider
                          ? 'text-[#ffcb51]'
                          : 'text-muted-foreground/40',
                      )}
                    />
                    <span className="text-sm">Provider</span>
                  </div>
                  {groupByProvider && (
                    <Check className="h-4 w-4 text-[#ffcb51]" />
                  )}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuLabel className="text-muted-foreground/30 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase">
                  Sort By
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleSortClick('date')}
                  className={cn(
                    'flex cursor-pointer items-center justify-between px-3 py-2.5',
                    sortCriterion === 'date' &&
                      'text-foreground bg-[#ffcb51]/10 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <Calendar
                      className={cn(
                        'h-4 w-4',
                        sortCriterion === 'date'
                          ? 'text-[#ffcb51]'
                          : 'text-muted-foreground/40',
                      )}
                    />
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
                            ? 'font-bold text-[#ffcb51]'
                            : 'text-muted-foreground/40',
                        )}
                      >
                        ASC
                      </span>
                      <Switch
                        checked={sortOrder === 'desc'}
                        onCheckedChange={handleSortOrderToggle}
                        className="h-4 w-7 scale-75 data-[state=checked]:bg-[#ffcb51]"
                      />
                      <span
                        className={cn(
                          'text-[10px]',
                          sortOrder === 'desc'
                            ? 'font-bold text-[#ffcb51]'
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
                    'flex cursor-pointer items-center justify-between px-3 py-2.5',
                    sortCriterion === 'name' &&
                      'text-foreground bg-[#ffcb51]/10 font-medium',
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <CaseSensitive
                      className={cn(
                        'h-4 w-4',
                        sortCriterion === 'name'
                          ? 'text-[#ffcb51]'
                          : 'text-muted-foreground/40',
                      )}
                    />
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
                            ? 'font-bold text-[#ffcb51]'
                            : 'text-muted-foreground/40',
                        )}
                      >
                        ASC
                      </span>
                      <Switch
                        checked={sortOrder === 'desc'}
                        onCheckedChange={handleSortOrderToggle}
                        className="h-4 w-7 scale-75 data-[state=checked]:bg-[#ffcb51]"
                      />
                      <span
                        className={cn(
                          'text-[10px]',
                          sortOrder === 'desc'
                            ? 'font-bold text-[#ffcb51]'
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

          <Button
            variant="outline"
            className="text-foreground h-11 border-[#ffcb51]/50 px-5 font-medium hover:border-[#ffcb51] hover:bg-[#ffcb51]/10"
            disabled={!projectId}
            onClick={handleOpenPlaygroundConfirm}
          >
            <Play className="mr-2 h-4 w-4" />
            Try Playground
          </Button>
          <Button
            asChild
            className="h-11 bg-[#ffcb51] px-5 font-bold text-black hover:bg-[#ffcb51]/90"
          >
            <Link
              to={createPath(pathsConfig.app.availableSources, projectSlug)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Datasource
            </Link>
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-8 py-0 lg:px-16">
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
        ) : groupByProvider ? (
          <div className="space-y-8">
            {Object.entries(groupedDatasources).map(([provider, items]) => {
              const isCollapsed = collapsedGroups.has(provider);
              return (
                <div key={provider} className="space-y-4">
                  <button
                    onClick={() => toggleGroupCollapse(provider)}
                    className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md p-2 transition-colors"
                  >
                    {isCollapsed ? (
                      <ChevronRight className="text-muted-foreground h-4 w-4" />
                    ) : (
                      <ChevronDown className="text-muted-foreground h-4 w-4" />
                    )}
                    <div className="flex items-center gap-2">
                      <div className="bg-muted/50 flex h-6 w-6 items-center justify-center rounded border p-1">
                        {pluginLogoMap.has(provider) ? (
                          <img
                            src={pluginLogoMap.get(provider)}
                            alt={provider}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="bg-muted-foreground/20 h-2 w-2 rounded" />
                        )}
                      </div>
                      <h3 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
                        {provider} ({items.length})
                      </h3>
                    </div>
                    <div className="bg-border h-px flex-1" />
                  </button>

                  {!isCollapsed &&
                    (isGridView ? (
                      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {items.map((datasource) => {
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
                              dataTest={`datasource-card-${datasource.id}`}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="bg-card overflow-hidden rounded-xl border">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                              <TableHead className="w-[40%] pl-6 font-semibold">
                                Name
                              </TableHead>
                              <TableHead className="font-semibold">
                                Provider
                              </TableHead>
                              <TableHead className="font-semibold">
                                Created
                              </TableHead>
                              <TableHead className="pr-6 text-right font-semibold">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((datasource) => {
                              const logo = datasource.datasource_provider
                                ? pluginLogoMap.get(
                                    datasource.datasource_provider,
                                  )
                                : undefined;
                              const formattedDateTime = formatRelativeTime(
                                new Date(datasource.createdAt),
                              );

                              return (
                                <TableRow
                                  key={datasource.id}
                                  className="group hover:bg-muted/30 cursor-pointer transition-colors"
                                  onClick={() =>
                                    navigate(
                                      createDatasourceViewPath(datasource.slug),
                                    )
                                  }
                                >
                                  <TableCell className="py-4 pl-6 font-medium">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-muted/50 group-hover:bg-background flex h-9 w-9 items-center justify-center rounded-lg border p-1.5 transition-colors">
                                        {logo ? (
                                          <img
                                            src={logo}
                                            alt={datasource.datasource_provider}
                                            className="h-full w-full object-contain"
                                          />
                                        ) : (
                                          <div className="bg-muted-foreground/20 h-4 w-4 rounded" />
                                        )}
                                      </div>
                                      <div className="flex flex-col">
                                        <span className="text-sm font-semibold">
                                          {highlightMatch(
                                            datasource.name,
                                            searchQuery,
                                          )}
                                        </span>
                                        <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                                          <User className="h-2.5 w-2.5" />
                                          {datasource.createdBy || 'System'}
                                        </span>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
                                      {datasource.datasource_provider}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-muted-foreground text-sm">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5" />
                                      {formattedDateTime}
                                    </div>
                                  </TableCell>
                                  <TableCell className="pr-6 text-right">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(
                                          createDatasourceViewPath(
                                            datasource.slug,
                                          ),
                                        );
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
                    ))}
                </div>
              );
            })}
          </div>
        ) : isGridView ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
          <div className="bg-card overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="w-[40%] pl-6 font-semibold">
                    Name
                  </TableHead>
                  <TableHead className="font-semibold">Provider</TableHead>
                  <TableHead className="font-semibold">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSortClick('date')}
                      className="hover:text-foreground group/sort -ml-3 h-8 gap-1 px-3 hover:bg-transparent"
                    >
                      Created
                      {sortCriterion === 'date' ? (
                        sortOrder === 'asc' ? (
                          <ArrowUp className="ml-1 h-3.5 w-3.5 text-[#ffcb51]" />
                        ) : (
                          <ArrowDown className="ml-1 h-3.5 w-3.5 text-[#ffcb51]" />
                        )
                      ) : (
                        <ArrowUpDown className="text-muted-foreground/30 group-hover/sort:text-muted-foreground ml-1 h-3.5 w-3.5" />
                      )}
                    </Button>
                  </TableHead>
                  <TableHead className="pr-6 text-right font-semibold">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedDatasources.map((datasource: Datasource) => {
                  const logo = datasource.datasource_provider
                    ? pluginLogoMap.get(datasource.datasource_provider)
                    : undefined;
                  const formattedDateTime = formatRelativeTime(
                    new Date(datasource.createdAt),
                  );

                  return (
                    <TableRow
                      key={datasource.id}
                      className="group hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(createDatasourceViewPath(datasource.slug))
                      }
                    >
                      <TableCell className="py-4 pl-6 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted/50 group-hover:bg-background flex h-9 w-9 items-center justify-center rounded-lg border p-1.5 transition-colors">
                            {logo ? (
                              <img
                                src={logo}
                                alt={datasource.datasource_provider}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <div className="bg-muted-foreground/20 h-4 w-4 rounded" />
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold">
                              {highlightMatch(datasource.name, searchQuery)}
                            </span>
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <User className="h-2.5 w-2.5" />
                              {datasource.createdBy || 'System'}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="bg-muted text-muted-foreground inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium tracking-wider uppercase">
                          {datasource.datasource_provider}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {formattedDateTime}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
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

      {totalPages > 1 && !groupByProvider && (
        <div className="bg-background/95 supports-backdrop-filter:bg-background/60 sticky bottom-0 z-10 flex shrink-0 items-center justify-center border-t py-6 backdrop-blur">
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
                          className="text-muted-foreground px-1 select-none"
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
                        effectiveCurrentPage === page ? 'default' : 'ghost'
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

      <PlaygroundConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        selectedSuggestion={selectedSuggestion}
        onConfirm={handleConfirmPlayground}
        isPending={createPlaygroundMutation.isPending}
        showRequestSection={false}
      />
    </div>
  );
}
