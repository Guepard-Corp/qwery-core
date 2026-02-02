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
  Plus,
  Notebook,
  X,
} from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { Switch } from '@qwery/ui/switch';
import { cn } from '@qwery/ui/utils';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

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
import pathsConfig, { createPath } from '~/config/paths.config';
import type { NotebookOutput } from '@qwery/domain/usecases';
import { useProject } from '~/lib/context/project-context';
import { useWorkspace } from '~/lib/context/workspace-context';
import { useCreateNotebook } from '~/lib/mutations/use-notebook';

const ITEMS_PER_PAGE = 10;

type SortCriterion = 'date' | 'name';
type SortOrder = 'asc' | 'desc';

export function ListNotebooks({
  notebooks,
  unsavedNotebookSlugs = [],
}: {
  notebooks: NotebookOutput[];
  unsavedNotebookSlugs?: string[];
}) {
  const { t } = useTranslation('notebooks');
  const navigate = useNavigate();
  const { projectId } = useProject();
  const { repositories } = useWorkspace();
  const createNotebookMutation = useCreateNotebook(
    repositories.notebook,
    (notebook) =>
      navigate(createPath(pathsConfig.app.projectNotebook, notebook.slug)),
    (error) =>
      toast.error(
        error instanceof Error ? error.message : 'Failed to create notebook',
      ),
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGridView, setIsGridView] = useState(false);
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [shouldAnimate, setShouldAnimate] = useState(false);

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

  const filteredNotebooks = useMemo(() => {
    const filtered = notebooks.filter((notebook) => {
      const matchesSearch =
        searchQuery === '' ||
        notebook.title.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });

    return filtered.sort((a, b) => {
      if (sortCriterion === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
      } else {
        const nameA = a.title.toLowerCase();
        const nameB = b.title.toLowerCase();
        if (nameA < nameB) return sortOrder === 'asc' ? -1 : 1;
        if (nameA > nameB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      }
    });
  }, [notebooks, searchQuery, sortCriterion, sortOrder]);

  // Reset to page 1 when filtered results change
  const effectiveCurrentPage = useMemo(() => {
    const totalPages = Math.ceil(filteredNotebooks.length / ITEMS_PER_PAGE);
    return currentPage > totalPages ? 1 : currentPage;
  }, [filteredNotebooks.length, currentPage]);

  const totalPages = Math.ceil(filteredNotebooks.length / ITEMS_PER_PAGE);
  const startIndex = (effectiveCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedNotebooks = filteredNotebooks.slice(startIndex, endIndex);

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
      setSortOrder('desc');
    }
  };

  const handleSortOrderToggle = (checked: boolean) => {
    setSortOrder(checked ? 'desc' : 'asc');
  };

  const handleCreateNotebook = () => {
    if (!projectId) return;
    createNotebookMutation.mutate({
      projectId,
      title: 'Untitled notebook',
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-6 p-6 pb-4 lg:p-10">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">
            <Trans i18nKey="notebooks:list_title" defaults="Notebooks" />
          </h1>
        </div>

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
              placeholder={t(
                'notebooks:search_placeholder',
                'Search notebooks...',
              )}
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
            <div className="bg-border/50 mx-1 h-6 w-px" />
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
                    <span className="text-sm">{t('grid_view', 'Grid')}</span>
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
                    <span className="text-sm">{t('table_view', 'Table')}</span>
                  </div>
                  {!isGridView && <Check className="h-4 w-4 text-[#ffcb51]" />}
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1" />

                <DropdownMenuLabel className="text-muted-foreground/30 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase">
                  {t('sort_by', 'Sort By')}
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
                    <span className="text-sm">{t('date', 'Date')}</span>
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
                        {t('asc', 'ASC')}
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
                        {t('desc', 'DESC')}
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
                    <span className="text-sm">{t('name', 'Name')}</span>
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
                        {t('asc', 'ASC')}
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
                        {t('desc', 'DESC')}
                      </span>
                    </div>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Button
            onClick={handleCreateNotebook}
            className="h-11 bg-[#ffcb51] px-5 font-bold text-black hover:bg-[#ffcb51]/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('new_notebook', 'New Notebook')}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-10 py-0">
        {filteredNotebooks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              {t('no_notebooks', 'No notebooks found')}
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? t(
                    'no_notebooks_description',
                    'Try adjusting your search query',
                  )
                : t('no_notebooks_empty', 'No notebooks have been created yet')}
            </p>
          </div>
        ) : isGridView ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {paginatedNotebooks.map((notebook) => {
              const hasUnsavedChanges = unsavedNotebookSlugs.includes(
                notebook.slug,
              );
              return (
                <div
                  key={notebook.id}
                  className="bg-card group relative overflow-hidden rounded-xl border transition-all hover:border-[#ffcb51]/50 hover:shadow-lg"
                >
                  <Link
                    to={createPath(
                      pathsConfig.app.projectNotebook,
                      notebook.slug,
                    )}
                    className="flex h-full flex-col p-6"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="bg-muted/50 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border">
                          <Notebook className="h-5 w-5" />
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-center gap-2">
                            <h3 className="truncate text-sm font-semibold">
                              {highlightMatch(notebook.title, searchQuery)}
                            </h3>
                            {hasUnsavedChanges && (
                              <span className="h-2 w-2 shrink-0 rounded-full border border-[#ffcb51]/50 bg-[#ffcb51] shadow-sm" />
                            )}
                          </div>
                          <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                            <User className="h-2.5 w-2.5" />
                            System
                          </span>
                        </div>
                      </div>
                      <div className="text-muted-foreground ml-2 flex shrink-0 items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(notebook.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </Link>
                </div>
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
                {paginatedNotebooks.map((notebook) => {
                  const hasUnsavedChanges = unsavedNotebookSlugs.includes(
                    notebook.slug,
                  );
                  const date = new Date(notebook.createdAt);

                  return (
                    <TableRow
                      key={notebook.id}
                      className="group hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() =>
                        navigate(
                          createPath(
                            pathsConfig.app.projectNotebook,
                            notebook.slug,
                          ),
                        )
                      }
                    >
                      <TableCell className="py-4 pl-6 font-medium">
                        <div className="flex items-center gap-3">
                          <div className="bg-muted/50 group-hover:bg-background flex h-9 w-9 items-center justify-center rounded-lg border p-1.5 transition-colors">
                            <Notebook className="h-5 w-5" />
                          </div>
                          <div className="flex min-w-0 flex-1 flex-col">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-semibold">
                                {highlightMatch(notebook.title, searchQuery)}
                              </span>
                              {hasUnsavedChanges && (
                                <span className="h-2 w-2 shrink-0 rounded-full border border-[#ffcb51]/50 bg-[#ffcb51] shadow-sm" />
                              )}
                            </div>
                            <span className="text-muted-foreground flex items-center gap-1 text-[11px]">
                              <User className="h-2.5 w-2.5" />
                              System
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {date.toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
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
                              createPath(
                                pathsConfig.app.projectNotebook,
                                notebook.slug,
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
        )}
      </div>

      {totalPages > 1 && (
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
              <span>{t('next', 'Next')}</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
