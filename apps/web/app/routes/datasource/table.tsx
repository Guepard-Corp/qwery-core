import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Columns,
  type ColumnListItem,
  type ColumnColumn,
  DEFAULT_VISIBLE_COLUMN_COLUMNS,
} from '@qwery/ui/qwery/datasource/columns';
import { PaginationControls } from '@qwery/ui/qwery/datasource';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import type { Column, Table } from '@qwery/domain/entities';
import { Input } from '@qwery/ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import {
  X,
  ChevronLeft,
  Table2,
  Info,
  Settings2,
  Filter,
  Loader2,
  Pencil,
  Scissors,
  Trash2,
  Settings,
} from 'lucide-react';
import { Button } from '@qwery/ui/button';
import { Skeleton } from '@qwery/ui/skeleton';
import { Label } from '@qwery/ui/label';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@qwery/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';

import type { Route } from './+types/table';
import { loadDatasourceBySlug } from '~/lib/loaders/load-datasource-by-slug';
import pathsConfig, { createPath } from '~/config/paths.config';
import { useDatasourceDdl } from '~/lib/mutations/use-datasource-ddl';
import { getErrorKey } from '~/lib/utils/error-key';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@qwery/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@qwery/ui/dialog';
import { Checkbox } from '@qwery/ui/checkbox';
import { toast } from 'sonner';

type ColumnActionDialog =
  | { kind: 'rename'; column: ColumnListItem }
  | { kind: 'delete'; column: ColumnListItem }
  | null;

type TableHeaderActionDialog = 'rename' | 'truncate' | 'delete' | null;

const COLUMN_PICKER_ITEMS: {
  column: ColumnColumn;
  i18nKey: string;
  defaultLabel: string;
}[] = [
  {
    column: 'name',
    i18nKey: 'datasource.table.columnPicker.name',
    defaultLabel: 'Name',
  },
  {
    column: 'description',
    i18nKey: 'datasource.table.columnPicker.description',
    defaultLabel: 'Description',
  },
  {
    column: 'type',
    i18nKey: 'datasource.table.columnPicker.typeAndFormat',
    defaultLabel: 'Type & Format',
  },
];

export const clientLoader = loadDatasourceBySlug;

export default function TablePage(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const navigate = useNavigate();
  const schemaParam = params.schema as string;
  const tableNameParam = params.tableName as string;
  const schema = schemaParam ? decodeURIComponent(schemaParam) : '';
  const tableName = tableNameParam ? decodeURIComponent(tableNameParam) : '';
  const { t } = useTranslation();
  const { datasource } = props.loaderData;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('datasource:columns:selectedType')
        : null;
    return raw && raw.trim().length > 0 ? raw : 'all';
  });
  const [pagination, setPagination] = useState(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('datasource:columns:pageSize')
        : null;
    const parsed = raw ? Number(raw) : NaN;
    const pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
    return { page: 1, pageSize };
  });
  const [visibleColumns, setVisibleColumns] = useState<ColumnColumn[]>(() => [
    ...DEFAULT_VISIBLE_COLUMN_COLUMNS,
  ]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: metadata, isLoading } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  const schemaActions = useDatasourceDdl(datasource);
  const [columnDialog, setColumnDialog] = useState<ColumnActionDialog>(null);
  const [renameColumnInput, setRenameColumnInput] = useState('');
  const [tableHeaderDialog, setTableHeaderDialog] =
    useState<TableHeaderActionDialog>(null);
  const [tableRenameInput, setTableRenameInput] = useState('');
  const [dropColumnCascade, setDropColumnCascade] = useState(false);
  const [isMutating, setIsMutating] = useState(false);

  const datasourceProvider = datasource?.datasource_provider ?? '';
  const supportsCascadeDropColumn = datasourceProvider.startsWith('postgresql');

  const table = useMemo(() => {
    if (!metadata?.tables || !schema || !tableName) return null;
    const tables = metadata.tables as Table[];
    return (
      tables.find(
        (t) => (t.schema ?? 'main') === schema && t.name === tableName,
      ) ?? null
    );
  }, [metadata, schema, tableName]);

  const filteredColumns = useMemo(() => {
    if (!metadata?.columns || !table) return [];
    const allColumns = metadata.columns as Column[];
    let cols = allColumns.filter(
      (col) =>
        col.table_id === table.id &&
        col.table === table.name &&
        (col.schema ?? 'main') === (table.schema ?? 'main'),
    );

    if (selectedType !== 'all') {
      cols = cols.filter((col) => col.data_type === selectedType);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      cols = cols.filter(
        (col) =>
          col.name.toLowerCase().includes(query) ||
          col.data_type.toLowerCase().includes(query) ||
          col.comment?.toLowerCase().includes(query),
      );
    }

    return cols;
  }, [metadata, table, searchQuery, selectedType]);

  const availableTypes = useMemo(() => {
    if (!metadata?.columns || !table) return [];
    const allColumns = metadata.columns as Column[];
    const set = new Set<string>();
    for (const col of allColumns) {
      if (
        col.table_id === table.id &&
        col.table === table.name &&
        (col.schema ?? 'main') === (table.schema ?? 'main')
      ) {
        set.add(col.data_type);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [metadata, table]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'datasource:columns:pageSize',
        String(pagination.pageSize),
      );
    } catch {
      // ignore
    }
  }, [pagination.pageSize]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'datasource:columns:selectedType',
        String(selectedType),
      );
    } catch {
      // ignore
    }
  }, [selectedType]);

  const columnListItems: ColumnListItem[] = useMemo(() => {
    return filteredColumns.map((col) => ({
      name: col.name,
      description: col.comment,
      dataType: col.data_type,
      format: col.format,
    }));
  }, [filteredColumns]);

  const totalCount = columnListItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (page - 1) * pagination.pageSize;
    return columnListItems.slice(start, start + pagination.pageSize);
  }, [columnListItems, page, pagination.pageSize]);

  const toggleColumn = useCallback((column: ColumnColumn) => {
    setVisibleColumns((prev) =>
      prev.includes(column)
        ? prev.filter((c) => c !== column)
        : [...prev, column],
    );
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      setPagination((p) => ({ ...p, page: 1 }));
    },
    [setSearchQuery, setPagination],
  );

  const handleTypeChange = useCallback(
    (value: string) => {
      setSelectedType(value);
      setPagination((p) => ({ ...p, page: 1 }));
    },
    [setSelectedType, setPagination],
  );

  const openRenameColumn = useCallback((column: ColumnListItem) => {
    setRenameColumnInput(column.name);
    setColumnDialog({ kind: 'rename', column });
  }, []);

  const openDeleteColumn = useCallback((column: ColumnListItem) => {
    setDropColumnCascade(false);
    setColumnDialog({ kind: 'delete', column });
  }, []);

  const confirmRenameColumn = useCallback(async () => {
    if (!table || !columnDialog || columnDialog.kind !== 'rename') return;
    const { column } = columnDialog;
    const next = renameColumnInput.trim();
    if (!next || next === column.name) return;
    const schema = table.schema ?? 'main';
    setIsMutating(true);
    try {
      await schemaActions.renameColumn(schema, table.name, column.name, next);
      toast.success(
        t('datasource.columns.actions.rename.success', {
          defaultValue: 'Column renamed',
        }),
      );
      setColumnDialog(null);
    } catch (e) {
      toast.error(getErrorKey(e, t));
    } finally {
      setIsMutating(false);
    }
  }, [columnDialog, renameColumnInput, schemaActions, t, table]);

  const confirmDeleteColumn = useCallback(async () => {
    if (!table || !columnDialog || columnDialog.kind !== 'delete') return;
    const { column } = columnDialog;
    const schema = table.schema ?? 'main';
    const canCascade = supportsCascadeDropColumn;
    setIsMutating(true);
    try {
      await schemaActions.dropColumn(schema, table.name, column.name, {
        cascade: canCascade && dropColumnCascade,
      });
      toast.success(
        t('datasource.columns.actions.delete.success', {
          defaultValue: 'Column dropped',
        }),
      );
      setColumnDialog(null);
    } catch (e) {
      const base = getErrorKey(e, t);
      const raw = e instanceof Error ? e.message : String(e);
      const lower = raw.toLowerCase();
      const looksLikeDependencyError =
        lower.includes('foreign key') ||
        lower.includes('dependent') ||
        lower.includes('cannot drop') ||
        lower.includes('constraint');
      toast.error(
        !dropColumnCascade && looksLikeDependencyError
          ? `${base} — ${t(
              'datasource.columns.dialog.delete.cascade.required',
              {
                defaultValue:
                  'This column appears to be referenced by a constraint. Enable Cascade (PostgreSQL) or drop the constraint first.',
              },
            )}`
          : base,
      );
    } finally {
      setIsMutating(false);
    }
  }, [
    columnDialog,
    dropColumnCascade,
    schemaActions,
    supportsCascadeDropColumn,
    table,
    t,
  ]);

  const tablesBasePath = createPath(pathsConfig.app.datasourceTables, slug);

  const openTableRename = useCallback(() => {
    if (!table) return;
    setTableRenameInput(table.name);
    setTableHeaderDialog('rename');
  }, [table]);

  const openTableTruncate = useCallback(() => {
    setTableHeaderDialog('truncate');
  }, []);

  const openTableDelete = useCallback(() => {
    setTableHeaderDialog('delete');
  }, []);

  const confirmTableRename = useCallback(async () => {
    if (!table) return;
    const next = tableRenameInput.trim();
    if (!next || next === table.name) return;
    const sch = table.schema ?? 'main';
    setIsMutating(true);
    try {
      await schemaActions.renameTable(sch, table.name, next);
      toast.success(
        t('datasource.tables.actions.rename.success', {
          defaultValue: 'Table renamed',
        }),
      );
      setTableHeaderDialog(null);
      navigate(
        `${tablesBasePath}/${encodeURIComponent(sch)}/${encodeURIComponent(next)}`,
      );
    } catch (e) {
      toast.error(getErrorKey(e, t));
    } finally {
      setIsMutating(false);
    }
  }, [navigate, schemaActions, table, tableRenameInput, tablesBasePath, t]);

  const confirmTableDestructive = useCallback(async () => {
    if (!table) return;
    const sch = table.schema ?? 'main';
    setIsMutating(true);
    try {
      if (tableHeaderDialog === 'truncate') {
        await schemaActions.truncateTable(sch, table.name);
        toast.success(
          t('datasource.tables.actions.truncate.success', {
            defaultValue: 'Table truncated',
          }),
        );
      } else if (tableHeaderDialog === 'delete') {
        await schemaActions.dropTable(sch, table.name);
        toast.success(
          t('datasource.tables.actions.delete.success', {
            defaultValue: 'Table deleted',
          }),
        );
        navigate(tablesBasePath);
      }
      setTableHeaderDialog(null);
    } catch (e) {
      toast.error(getErrorKey(e, t));
    } finally {
      setIsMutating(false);
    }
  }, [navigate, schemaActions, table, tableHeaderDialog, tablesBasePath, t]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'f' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-col gap-5 px-8 py-6 lg:px-16 lg:py-10">
          <Skeleton className="h-4 w-28 rounded-md" />
          <Skeleton className="h-10 w-72 rounded-lg" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 flex-1 rounded-xl" />
            <Skeleton className="h-12 w-[170px] rounded-xl" />
          </div>
        </div>
        <div className="min-h-0 flex-1 px-8 py-6 lg:px-16 lg:py-6">
          <Skeleton className="h-full w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!metadata || !table) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center lg:px-16 lg:py-16">
        <div className="bg-muted/50 mb-4 rounded-full p-4">
          <Info className="text-muted-foreground/40 h-8 w-8" />
        </div>
        <p className="text-foreground mb-1 font-medium">
          {t('datasource.table.error', { defaultValue: 'Table not found' })}
        </p>
        <Button variant="link" onClick={() => navigate(tablesBasePath)}>
          {t('common.actions.back_to_tables', {
            defaultValue: 'Back to tables',
          })}
        </Button>
      </div>
    );
  }

  const renameColumnSubmitEnabled =
    columnDialog?.kind === 'rename' &&
    renameColumnInput.trim().length > 0 &&
    renameColumnInput.trim() !== columnDialog.column.name;

  const tableRenameSubmitEnabled =
    tableRenameInput.trim().length > 0 &&
    tableRenameInput.trim() !== table.name;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-6 px-8 py-6 lg:px-16 lg:py-10">
        <div className="flex flex-col gap-2">
          <Link
            to={tablesBasePath}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs font-medium transition-colors"
          >
            <ChevronLeft className="h-3 w-3" />
            {t('datasource.table.back_to_tables', {
              defaultValue: 'Back to tables',
            })}
          </Link>
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border p-2">
                <Table2 className="text-foreground h-5 w-5" />
              </div>
              <h1 className="truncate text-4xl font-bold tracking-tight">
                {table.name}
              </h1>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  aria-label={t('datasource.table.actions.open', {
                    defaultValue: 'Table actions',
                  })}
                >
                  <Settings className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={openTableRename}>
                  <Pencil className="mr-2 h-4 w-4" aria-hidden />
                  {t('datasource.tables.actions.rename', {
                    defaultValue: 'Rename',
                  })}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={openTableTruncate}>
                  <Scissors className="mr-2 h-4 w-4" aria-hidden />
                  {t('datasource.tables.actions.truncate', {
                    defaultValue: 'Truncate',
                  })}
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={openTableDelete}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {t('datasource.tables.actions.delete', {
                    defaultValue: 'Delete',
                  })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {table.comment && (
            <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
              {table.comment}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted/30 border-border/50 focus-within:border-border flex h-12 flex-1 items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent">
            <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('datasource.table.columns.search.placeholder', {
                defaultValue: 'Search columns by name, type or description...',
              })}
              className="h-full flex-1 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => handleSearchChange('')}
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
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="text-muted-foreground/30 px-2 py-1.5 text-[10px] font-bold tracking-widest uppercase">
                  Toggle Visibility
                </DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  checked={visibleColumns.length === COLUMN_PICKER_ITEMS.length}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setVisibleColumns(
                        COLUMN_PICKER_ITEMS.map((item) => item.column),
                      );
                    } else {
                      setVisibleColumns(['name']);
                    }
                  }}
                  className="font-medium"
                >
                  Select All
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator className="my-1" />
                {COLUMN_PICKER_ITEMS.map(
                  ({ column, i18nKey, defaultLabel }) => (
                    <DropdownMenuCheckboxItem
                      key={column}
                      checked={visibleColumns.includes(column)}
                      onCheckedChange={() => toggleColumn(column)}
                      disabled={
                        visibleColumns.length === 1 &&
                        visibleColumns.includes(column)
                      }
                    >
                      {t(i18nKey, { defaultValue: defaultLabel })}
                    </DropdownMenuCheckboxItem>
                  ),
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Select value={selectedType} onValueChange={handleTypeChange}>
            <SelectTrigger className="bg-muted/30 border-border/50 hover:bg-muted flex h-12 w-[170px] items-center gap-3 rounded-xl border px-4 transition-all focus:ring-0 focus-visible:ring-0">
              <Filter className="text-muted-foreground/60 h-5 w-5 shrink-0" />
              <SelectValue
                placeholder="All Types"
                className="text-sm font-medium"
              >
                {selectedType === 'all' ? 'All Types' : selectedType}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {availableTypes.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="flex h-full flex-col px-8 py-6 lg:px-16 lg:py-6">
          <div className="min-h-0 flex-1">
            <Columns
              columns={pagedItems}
              searchQuery={searchQuery}
              visibleColumns={visibleColumns}
              onRenameColumn={openRenameColumn}
              onDeleteColumn={openDeleteColumn}
              className="mb-0 h-full"
            />
          </div>

          <PaginationControls
            page={page}
            pageSize={pagination.pageSize}
            totalCount={totalCount}
            onPageSizeChange={(nextPageSize) =>
              setPagination({ page: 1, pageSize: nextPageSize })
            }
            onPageChange={(nextPage) =>
              setPagination((p) => ({ ...p, page: nextPage }))
            }
          />
        </div>
      </div>

      <Dialog
        open={columnDialog?.kind === 'rename'}
        onOpenChange={(open) => {
          if (!open) setColumnDialog(null);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {t('datasource.columns.dialog.rename.title', {
                defaultValue: 'Rename column',
              })}
            </DialogTitle>
            <DialogDescription>
              {t('datasource.columns.dialog.rename.description', {
                defaultValue: 'Enter a new name for this column.',
              })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={renameColumnInput}
            onChange={(e) => setRenameColumnInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                renameColumnSubmitEnabled &&
                !isMutating
              ) {
                void confirmRenameColumn();
              }
            }}
            placeholder={t('datasource.columns.dialog.rename.placeholder', {
              defaultValue: 'Column name',
            })}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => setColumnDialog(null)}
            >
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              disabled={isMutating || !renameColumnSubmitEnabled}
              onClick={() => void confirmRenameColumn()}
            >
              {isMutating && columnDialog?.kind === 'rename' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                t('datasource.columns.dialog.rename.confirm', {
                  defaultValue: 'Rename',
                })
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={columnDialog?.kind === 'delete'}
        onOpenChange={(open) => {
          if (!open) setColumnDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('datasource.columns.dialog.delete.title', {
                defaultValue: 'Drop column?',
              })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('datasource.columns.dialog.delete.description', {
                defaultValue:
                  'The column will be removed from the table. If this column is referenced by a constraint (e.g. a foreign key), the operation may fail unless you enable Cascade (PostgreSQL) or drop the constraint first.',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-3 flex items-start gap-3">
            <Checkbox
              id="drop-column-cascade"
              checked={dropColumnCascade}
              onCheckedChange={(checked) => {
                setDropColumnCascade(Boolean(checked));
              }}
              disabled={!supportsCascadeDropColumn}
            />
            <div className="grid gap-1">
              <Label htmlFor="drop-column-cascade" className="text-sm">
                {t('datasource.columns.dialog.delete.cascade.label', {
                  defaultValue: 'Cascade',
                })}
              </Label>
              <p className="text-muted-foreground text-xs">
                {t('datasource.columns.dialog.delete.cascade.help', {
                  defaultValue:
                    'PostgreSQL only. Drops dependent constraints (e.g. foreign keys).',
                })}
              </p>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={isMutating}
              onClick={() => void confirmDeleteColumn()}
            >
              {isMutating && columnDialog?.kind === 'delete' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                t('datasource.columns.dialog.delete.confirm', {
                  defaultValue: 'Drop column',
                })
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={tableHeaderDialog === 'rename'}
        onOpenChange={(open) => {
          if (!open) setTableHeaderDialog(null);
        }}
      >
        <DialogContent
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>
              {t('datasource.tables.dialog.rename.title', {
                defaultValue: 'Rename table',
              })}
            </DialogTitle>
            <DialogDescription>
              {t('datasource.tables.dialog.rename.description', {
                defaultValue: 'Enter a new name for this table.',
              })}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={tableRenameInput}
            onChange={(e) => setTableRenameInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === 'Enter' &&
                tableRenameSubmitEnabled &&
                !isMutating
              ) {
                void confirmTableRename();
              }
            }}
            placeholder={t('datasource.tables.dialog.rename.placeholder', {
              defaultValue: 'Table name',
            })}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isMutating}
              onClick={() => setTableHeaderDialog(null)}
            >
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              disabled={isMutating || !tableRenameSubmitEnabled}
              onClick={() => void confirmTableRename()}
            >
              {isMutating && tableHeaderDialog === 'rename' ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                t('datasource.tables.dialog.rename.confirm', {
                  defaultValue: 'Rename',
                })
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={
          tableHeaderDialog === 'truncate' || tableHeaderDialog === 'delete'
        }
        onOpenChange={(open) => {
          if (!open) setTableHeaderDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tableHeaderDialog === 'truncate'
                ? t('datasource.tables.dialog.truncate.title', {
                    defaultValue: 'Truncate table?',
                  })
                : t('datasource.tables.dialog.delete.title', {
                    defaultValue: 'Delete table?',
                  })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tableHeaderDialog === 'truncate'
                ? t('datasource.tables.dialog.truncate.description', {
                    defaultValue:
                      'All rows will be removed. This cannot be undone.',
                  })
                : t('datasource.tables.dialog.delete.description', {
                    defaultValue:
                      'The table and its data will be permanently removed.',
                  })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </AlertDialogCancel>
            <Button
              type="button"
              disabled={isMutating}
              variant={
                tableHeaderDialog === 'delete' ? 'destructive' : 'default'
              }
              onClick={() => void confirmTableDestructive()}
            >
              {isMutating &&
              (tableHeaderDialog === 'truncate' ||
                tableHeaderDialog === 'delete') ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : tableHeaderDialog === 'truncate' ? (
                t('datasource.tables.dialog.truncate.confirm', {
                  defaultValue: 'Truncate',
                })
              ) : (
                t('datasource.tables.dialog.delete.confirm', {
                  defaultValue: 'Delete',
                })
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
