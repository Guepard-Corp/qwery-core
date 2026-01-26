import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
} from '@radix-ui/react-icons';
import {
  LayoutGrid,
  List,
  Clock,
  Settings2,
  Check,
  Calendar,
  CaseSensitive,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';

import type { Project } from '@qwery/domain/entities';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { Switch } from '@qwery/ui/switch';
import { Checkbox } from '@qwery/ui/checkbox';
import { cn } from '@qwery/ui/utils';
import { formatRelativeTime } from '@qwery/ui/ai';
import { ProjectCard } from '@qwery/ui/project';
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
import { ConfirmDeleteDialog } from '@qwery/ui/qwery/confirm-delete-dialog';
import { Badge } from '@qwery/ui/badge';

import pathsConfig, { createPath } from '~/config/paths.config';
import { useBulkProjects } from '~/lib/mutations/use-bulk-operations';
import { ProjectDialog } from './project-dialog';
import { BulkActionBar } from '../../_components/bulk-action-bar';

const ITEMS_PER_PAGE_GRID = 12;
const ITEMS_PER_PAGE_TABLE = 10;

type SortCriterion = 'date' | 'name';
type SortOrder = 'asc' | 'desc';

export function ListProjects({
  projects,
  newProjectButton,
  organizationId,
}: {
  projects: Project[];
  newProjectButton?: React.ReactNode;
  organizationId: string;
}) {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGridView, setIsGridView] = useState(true);

  useEffect(() => {
    if (isGridView) {
      setSelectedIds(new Set());
    }
  }, [isGridView]);
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

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

  const bulkDeleteMutation = useBulkProjects({
    onSuccess: (response) => {
      const deletedCount = response.deletedCount ?? selectedIds.size;
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      toast.success(
        `Deleted ${deletedCount} project${deletedCount !== 1 ? 's' : ''}`,
      );
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete projects');
    },
  });

  const filteredProjects = useMemo(() => {
    const filtered = projects.filter((project) => {
      const matchesSearch =
        searchQuery === '' ||
        project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.description &&
          project.description.toLowerCase().includes(searchQuery.toLowerCase()));
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
  }, [projects, searchQuery, sortCriterion, sortOrder]);

  const itemsPerPage = isGridView ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;

  const effectiveCurrentPage = useMemo(() => {
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    return currentPage > totalPages ? 1 : currentPage;
  }, [filteredProjects.length, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
  const startIndex = (effectiveCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

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

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setShowDialog(true);
  };

  const handleDeleteSingle = (project: Project) => {
    setSelectedIds(new Set([project.id]));
    setDeletingProject(project);
    setShowDeleteDialog(true);
  };

  const handleCreate = () => {
    setEditingProject(null);
    setShowDialog(true);
  };

  const handleDialogSuccess = () => {
    setEditingProject(null);
  };

  const handleConfirmDelete = () => {
    bulkDeleteMutation.mutate({
      operation: 'delete',
      ids: Array.from(selectedIds),
    });
    setDeletingProject(null);
  };


  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cn(
        "flex shrink-0 flex-col gap-6 py-6 lg:py-10",
        !isGridView && selectedIds.size > 0 ? "pb-0" : "pb-4"
      )}>
        <div className="mx-auto w-full max-w-7xl px-48 lg:px-32 my-4">
          <h1 className="text-5xl font-bold">
            <Trans i18nKey="organizations:projects_title" />
          </h1>
        </div>

        <div className="mx-auto w-full max-w-7xl px-24 lg:px-32">
          <div className="flex items-center gap-3">
            <div className="group/search relative flex-1">
              <MagnifyingGlassIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                ref={searchInputRef}
                type="search"
                placeholder="Search projects..."
                className={cn(
                  'h-11 w-full pl-9 transition-all',
                  shouldAnimate && 'ring-primary animate-pulse ring-2 ring-offset-2',
                  searchQuery ? 'pr-20' : 'pr-20',
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-12 -translate-y-1/2 cursor-pointer z-10"
                >
                  <span className="text-lg leading-none">×</span>
                </button>
              )}
              <div className={cn(
                "absolute top-1/2 right-2 -translate-y-1/2 transition-opacity duration-200",
                searchQuery 
                  ? "opacity-100" 
                  : "opacity-0 group-hover/search:opacity-100 group-focus-within/search:opacity-100"
              )}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-accent/50 h-8 w-8 border-none p-0 focus-visible:ring-0"
                    >
                      <Settings2 className="text-muted-foreground/60 h-4 w-4" />
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
                            isGridView ? 'text-[#ffcb51]' : 'text-muted-foreground/40',
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
                        !isGridView && 'text-foreground bg-[#ffcb51]/10 font-medium',
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <List
                          className={cn(
                            'h-4 w-4',
                            !isGridView ? 'text-[#ffcb51]' : 'text-muted-foreground/40',
                          )}
                        />
                        <span className="text-sm">Table</span>
                      </div>
                      {!isGridView && <Check className="h-4 w-4 text-[#ffcb51]" />}
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
            </div>

            {newProjectButton || (
              <Button
                onClick={handleCreate}
                className="h-11 bg-[#ffcb51] px-5 font-bold text-black hover:bg-[#ffcb51]/90 cursor-pointer"
              >
                <Plus className="mr-2 h-4 w-4" />
                <Trans i18nKey="organizations:new_project" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-0">
        {filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              <Trans i18nKey="organizations:no_projects" />
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'No projects have been created yet'}
            </p>
          </div>
        ) : isGridView ? (
          <div className="mx-auto w-full max-w-7xl px-24 lg:px-32 pb-8">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {paginatedProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  id={project.id}
                  name={project.name}
                  description={project.description}
                  status={project.status}
                  createdAt={project.createdAt}
                  onClick={() => {
                    const path = createPath(pathsConfig.app.project, project.slug);
                    navigate(path);
                  }}
                  onEdit={() => handleEdit(project)}
                  onDelete={() => handleDeleteSingle(project)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto w-full max-w-7xl px-24 lg:px-32">
            {!isGridView && (
              <BulkActionBar
                selectedCount={selectedIds.size}
                entityType="Project"
                onDelete={() => {
                  if (selectedIds.size > 0) {
                    setShowDeleteDialog(true);
                  }
                }}
                onClearSelection={() => setSelectedIds(new Set())}
              />
            )}
            <div className="bg-card overflow-hidden rounded-xl border mb-8">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-sidebar/80 hover:bg-sidebar/80 backdrop-blur-sm">
                    <TableHead className="w-[50px]">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={
                            paginatedProjects.length > 0 &&
                            paginatedProjects.every((project) => selectedIds.has(project.id))
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(new Set(paginatedProjects.map((project) => project.id)));
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="w-[40%] font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
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
                    <TableHead className="pr-6 text-right font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProjects.map((project) => {
                    const formattedDateTime = formatRelativeTime(new Date(project.createdAt));
                    const isSelected = selectedIds.has(project.id);
                    const statusColor =
                      project.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : project.status === 'inactive'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';

                    return (
                      <TableRow
                        key={project.id}
                        className={cn(
                          'group hover:bg-muted/30 cursor-pointer transition-colors',
                          isSelected && 'bg-muted/50',
                        )}
                        onClick={() => {
                          const path = createPath(pathsConfig.app.project, project.slug);
                          navigate(path);
                        }}
                      >
                        <TableCell
                          className="py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelection(project.id)}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="py-4 font-medium">
                          <div className="flex items-center gap-3">
                            <div className="bg-muted/50 group-hover:bg-background flex h-9 w-9 items-center justify-center rounded-lg border p-1.5 transition-colors">
                              <svg
                                className="text-foreground h-5 w-5"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                />
                              </svg>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">
                                {highlightMatch(project.name, searchQuery)}
                              </span>
                              {project.description && (
                                <span className="text-muted-foreground mt-0.5 line-clamp-1 text-[11px]">
                                  {project.description}
                                </span>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={cn('h-5 px-2 text-[10px] uppercase tracking-wider font-bold border shrink-0', statusColor)}>
                            {project.status || 'active'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            {formattedDateTime}
                          </div>
                        </TableCell>
                        <TableCell
                          className="pr-6 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={selectedIds.size > 0}
                                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(project)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <Trans i18nKey="common:update" />
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteSingle(project)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <Trans i18nKey="organizations:Delete" defaults="Delete" />
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
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
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                const showPage =
                  page === 1 ||
                  page === totalPages ||
                  (page >= effectiveCurrentPage - 1 && page <= effectiveCurrentPage + 1);

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
                    variant={effectiveCurrentPage === page ? 'default' : 'ghost'}
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
              })}
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

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={(open: boolean) => {
          setShowDeleteDialog(open);
          if (!open) {
            setDeletingProject(null);
            setSelectedIds(new Set());
          }
        }}
        onConfirm={handleConfirmDelete}
        itemName="project"
        itemCount={selectedIds.size}
        isLoading={bulkDeleteMutation.isPending}
      />

      <ProjectDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        project={editingProject}
        organizationId={organizationId}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
