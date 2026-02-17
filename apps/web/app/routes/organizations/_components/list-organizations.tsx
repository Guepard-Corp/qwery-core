import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
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
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

import type { Organization } from '@qwery/domain/entities';
import { getErrorKey } from '~/lib/utils/error-key';
import { Button } from '@qwery/ui/button';
import { Input } from '@qwery/ui/input';
import { Trans } from '@qwery/ui/trans';
import { Switch } from '@qwery/ui/switch';
import { Checkbox } from '@qwery/ui/checkbox';
import { cn } from '@qwery/ui/utils';
import { formatRelativeTime } from '@qwery/ui/ai-utils';
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
import { OrganizationCard } from '@qwery/ui/organization';

import pathsConfig, { createPath } from '~/config/paths.config';
import { useBulkOrganizations } from '~/lib/mutations/use-bulk-operations';
import { OrganizationDialog } from './organization-dialog';
import { BulkActionBar } from '../../_components/bulk-action-bar';

const ITEMS_PER_PAGE_GRID = 9;
const ITEMS_PER_PAGE_TABLE = 10;

type SortCriterion = 'date' | 'name';
type SortOrder = 'asc' | 'desc';

export function ListOrganizations({
  organizations,
}: {
  organizations: Organization[];
}) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isGridView, setIsGridView] = useState(true);
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isGridView) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedIds(new Set());
    }
  }, [isGridView]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [editingOrganization, setEditingOrganization] =
    useState<Organization | null>(null);

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

  const bulkDeleteMutation = useBulkOrganizations({
    onSuccess: (response) => {
      const deletedCount = response.deletedCount ?? selectedIds.size;
      setSelectedIds(new Set());
      setShowDeleteDialog(false);
      toast.success(
        `Deleted ${deletedCount} organization${deletedCount !== 1 ? 's' : ''}`,
      );
    },
    onError: (error) => {
      toast.error(getErrorKey(error, t));
    },
  });

  const filteredOrganizations = useMemo(() => {
    const filtered = organizations.filter((org) => {
      const matchesSearch =
        searchQuery === '' ||
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase());
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
  }, [organizations, searchQuery, sortCriterion, sortOrder]);

  const itemsPerPage = isGridView ? ITEMS_PER_PAGE_GRID : ITEMS_PER_PAGE_TABLE;

  const effectiveCurrentPage = useMemo(() => {
    const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
    return currentPage > totalPages ? 1 : currentPage;
  }, [filteredOrganizations.length, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
  const startIndex = (effectiveCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrganizations = filteredOrganizations.slice(
    startIndex,
    endIndex,
  );

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

  const handleEdit = (org: Organization) => {
    setEditingOrganization(org);
    setShowDialog(true);
  };

  const handleDeleteSingle = (org: Organization) => {
    setSelectedIds(new Set([org.id]));
    setShowDeleteDialog(true);
  };

  const handleCreate = () => {
    setEditingOrganization(null);
    setShowDialog(true);
  };

  const handleDialogSuccess = () => {
    setEditingOrganization(null);
  };

  const handleConfirmDelete = () => {
    bulkDeleteMutation.mutate({
      operation: 'delete',
      ids: Array.from(selectedIds),
    });
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
      <div
        className={cn(
          'flex shrink-0 flex-col gap-6 py-6 lg:py-10',
          !isGridView && selectedIds.size > 0 ? 'pb-0' : 'pb-4',
        )}
      >
        <div className="w-full px-8 lg:px-16">
          <h1 className="text-3xl font-bold">
            <Trans i18nKey="organizations:title" />
          </h1>
        </div>

        <div className="w-full px-8 lg:px-16">
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
                placeholder="Search organizations..."
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
                      isGridView &&
                        'text-foreground bg-[#ffcb51]/10 font-medium',
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
                    {!isGridView && (
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
              onClick={handleCreate}
              className="h-11 cursor-pointer bg-[#ffcb51] px-5 font-bold text-black hover:bg-[#ffcb51]/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              <Trans i18nKey="organizations:new_organization" />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto py-0">
        {filteredOrganizations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-foreground mb-2 text-base font-medium">
              <Trans i18nKey="organizations:no_organizations" />
            </p>
            <p className="text-muted-foreground text-sm">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'No organizations have been created yet'}
            </p>
          </div>
        ) : isGridView ? (
          <div className="w-full px-8 pb-8 lg:px-16">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {paginatedOrganizations.map((org) => (
                <OrganizationCard
                  key={org.id}
                  id={org.id}
                  name={org.name}
                  createdAt={org.createdAt}
                  onClick={() => {
                    const path = createPath(
                      pathsConfig.app.organizationView,
                      org.slug,
                    );
                    navigate(path);
                  }}
                  onEdit={() => handleEdit(org)}
                  onDelete={() => handleDeleteSingle(org)}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="w-full px-8 lg:px-16">
            <BulkActionBar
              selectedCount={selectedIds.size}
              entityType="Organization"
              onDelete={() => {
                if (selectedIds.size > 0) {
                  setShowDeleteDialog(true);
                }
              }}
              onClearSelection={() => setSelectedIds(new Set())}
            />
            <div className="bg-card mb-8 overflow-hidden rounded-xl border">
              <Table>
                <TableHeader className="sticky top-0 z-10">
                  <TableRow className="bg-sidebar/80 hover:bg-sidebar/80 backdrop-blur-sm">
                    <TableHead className="w-[50px]">
                      <div className="flex items-center justify-center">
                        <Checkbox
                          checked={
                            paginatedOrganizations.length > 0 &&
                            paginatedOrganizations.every((org) =>
                              selectedIds.has(org.id),
                            )
                          }
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedIds(
                                new Set(
                                  paginatedOrganizations.map((org) => org.id),
                                ),
                              );
                            } else {
                              setSelectedIds(new Set());
                            }
                          }}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="w-[40%] font-semibold">
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
                  {paginatedOrganizations.map((org) => {
                    const formattedDateTime = formatRelativeTime(
                      new Date(org.createdAt),
                    );
                    const isSelected = selectedIds.has(org.id);

                    return (
                      <TableRow
                        key={org.id}
                        className={cn(
                          'group hover:bg-muted/30 cursor-pointer transition-colors',
                          isSelected && 'bg-muted/50',
                        )}
                        onClick={() => {
                          const path = createPath(
                            pathsConfig.app.organizationView,
                            org.slug,
                          );
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
                              onCheckedChange={() => toggleSelection(org.id)}
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
                                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                                />
                              </svg>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold">
                                {highlightMatch(org.name, searchQuery)}
                              </span>
                            </div>
                          </div>
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
                                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEdit(org)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <Trans i18nKey="common:update" />
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteSingle(org)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                <Trans
                                  i18nKey="organizations:Delete"
                                  defaults="Delete"
                                />
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

      <ConfirmDeleteDialog
        open={showDeleteDialog}
        onOpenChange={(open: boolean) => {
          setShowDeleteDialog(open);
          if (!open) {
            setSelectedIds(new Set());
          }
        }}
        onConfirm={handleConfirmDelete}
        itemName="organization"
        itemCount={selectedIds.size}
        isLoading={bulkDeleteMutation.isPending}
      />

      <OrganizationDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        organization={editingOrganization}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}
