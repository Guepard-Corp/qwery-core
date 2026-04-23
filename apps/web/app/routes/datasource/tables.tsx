import { useCallback, useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Tables,
  type TableListItem,
  type TableColumn,
  DEFAULT_VISIBLE_TABLE_COLUMNS,
} from '@qwery/ui/qwery/datasource/tables';
import { PaginationControls } from '@qwery/ui/qwery/datasource';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@qwery/ui/dropdown-menu';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import type { Table, Column } from '@qwery/domain/entities';
import { Input } from '@qwery/ui/input';
import { MagnifyingGlassIcon } from '@radix-ui/react-icons';
import { X, Filter, Settings2, Loader2 } from 'lucide-react';
import { Button } from '@qwery/ui/button';
import { Skeleton } from '@qwery/ui/skeleton';

import type { Route } from './+types/tables';
import { loadDatasourceBySlug } from '~/lib/loaders/load-datasource-by-slug';
import pathsConfig, { createPath } from '~/config/paths.config';
import { DevProfiler } from '~/lib/perf/dev-profiler';
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
import { toast } from 'sonner';

type TableActionDialog =
  | { kind: 'rename'; table: TableListItem }
  | { kind: 'truncate'; table: TableListItem }
  | { kind: 'delete'; table: TableListItem }
  | null;

const COLUMN_PICKER_ITEMS: {
  column: TableColumn;
  i18nKey: string;
  defaultLabel: string;
}[] = [
  {
    column: 'name',
    i18nKey: 'datasource.tables.columnPicker.name',
    defaultLabel: 'Name',
  },
  {
    column: 'description',
    i18nKey: 'datasource.tables.columnPicker.description',
    defaultLabel: 'Description',
  },
  {
    column: 'columns',
    i18nKey: 'datasource.tables.columnPicker.columnsCount',
    defaultLabel: 'Columns count',
  },
  {
    column: 'rows',
    i18nKey: 'datasource.tables.columnPicker.rowsAndSize',
    defaultLabel: 'Rows & size',
  },
  {
    column: 'actions',
    i18nKey: 'datasource.tables.columnPicker.actions',
    defaultLabel: 'Actions',
  },
];

export const clientLoader = loadDatasourceBySlug;

export default function TablesPage(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { datasource } = props.loaderData;
  const [selectedSchema, setSelectedSchema] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState(() => {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem('datasource:tables:pageSize')
        : null;
    const parsed = raw ? Number(raw) : NaN;
    const pageSize = Number.isFinite(parsed) && parsed > 0 ? parsed : 50;
    return { page: 1, pageSize };
  });
  const [visibleColumns, setVisibleColumns] = useState<TableColumn[]>(() => [
    ...DEFAULT_VISIBLE_TABLE_COLUMNS,
  ]);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: metadata, isLoading } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  const schemaActions = useDatasourceDdl(datasource);
  const [tableDialog, setTableDialog] = useState<TableActionDialog>(null);
  const [renameTableInput, setRenameTableInput] = useState('');
  const [isMutating, setIsMutating] = useState(false);

  const schemas = useMemo(() => {
    if (!metadata?.schemas) return [];
    return Array.from(new Set(metadata.schemas.map((s) => s.name))).sort();
  }, [metadata]);

  const filteredTables = useMemo(() => {
    if (!metadata?.tables) return [];
    let tables = metadata.tables as Table[];

    if (selectedSchema !== 'all') {
      tables = tables.filter(
        (table) => (table.schema ?? 'main') === selectedSchema,
      );
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      tables = tables.filter(
        (table) =>
          table.name.toLowerCase().includes(query) ||
          table.comment?.toLowerCase().includes(query),
      );
    }

    return tables;
  }, [metadata, selectedSchema, searchQuery]);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'datasource:tables:pageSize',
        String(pagination.pageSize),
      );
    } catch {
      // ignore
    }
  }, [pagination.pageSize]);

  const columnCountByTableId = useMemo(() => {
    const map = new Map<string, number>();
    for (const col of (metadata?.columns ?? []) as Column[]) {
      const key = String(col.table_id);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [metadata?.columns]);

  const tableListItems: TableListItem[] = useMemo(() => {
    return filteredTables.map((table) => ({
      tableName: table.name,
      schema: table.schema ?? 'main',
      description: table.comment,
      rowsEstimated: table.live_rows_estimate || 0,
      sizeEstimated: table.size || '0 B',
      numberOfColumns:
        columnCountByTableId.get(String(table.id)) ??
        table.columns?.length ??
        0,
    }));
  }, [filteredTables, columnCountByTableId]);

  const totalCount = tableListItems.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pagination.pageSize));
  const page = Math.min(pagination.page, totalPages);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pagination.pageSize;
    return tableListItems.slice(start, start + pagination.pageSize);
  }, [tableListItems, page, pagination.pageSize]);

  const basePath = createPath(pathsConfig.app.datasourceTables, slug);

  const handleTableClick = useCallback(
    (table: TableListItem) => {
      const schema = encodeURIComponent(table.schema ?? 'main');
      const tableName = encodeURIComponent(table.tableName);
      navigate(`${basePath}/${schema}/${tableName}`);
    },
    [basePath, navigate],
  );

  const toggleColumn = useCallback((column: TableColumn) => {
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

  const handleSchemaChange = useCallback(
    (schemaValue: string) => {
      setSelectedSchema(schemaValue);
      setPagination((p) => ({ ...p, page: 1 }));
    },
    [setSelectedSchema, setPagination],
  );

  const openRenameTable = useCallback((table: TableListItem) => {
    setRenameTableInput(table.tableName);
    setTableDialog({ kind: 'rename', table });
  }, []);

  const openTruncateTable = useCallback((table: TableListItem) => {
    setTableDialog({ kind: 'truncate', table });
  }, []);

  const openDeleteTable = useCallback((table: TableListItem) => {
    setTableDialog({ kind: 'delete', table });
  }, []);

  const confirmRenameTable = useCallback(async () => {
    if (!tableDialog || tableDialog.kind !== 'rename') return;
    const { table } = tableDialog;
    const next = renameTableInput.trim();
    if (!next || next === table.tableName) return;
    setIsMutating(true);
    try {
      await schemaActions.renameTable(table.schema, table.tableName, next);
      toast.success(
        t('datasource.tables.actions.rename.success', {
          defaultValue: 'Table renamed',
        }),
      );
      setTableDialog(null);
    } catch (e) {
      toast.error(getErrorKey(e, t));
    } finally {
      setIsMutating(false);
    }
  }, [renameTableInput, schemaActions, tableDialog, t]);

  const confirmDestructiveTable = useCallback(async () => {
    if (!tableDialog || tableDialog.kind === 'rename') return;
    const { table } = tableDialog;
    setIsMutating(true);
    try {
      if (tableDialog.kind === 'truncate') {
        await schemaActions.truncateTable(table.schema, table.tableName);
        toast.success(
          t('datasource.tables.actions.truncate.success', {
            defaultValue: 'Table truncated',
          }),
        );
      } else {
        await schemaActions.dropTable(table.schema, table.tableName);
        toast.success(
          t('datasource.tables.actions.delete.success', {
            defaultValue: 'Table deleted',
          }),
        );
      }
      setTableDialog(null);
    } catch (e) {
      toast.error(getErrorKey(e, t));
    } finally {
      setIsMutating(false);
    }
  }, [schemaActions, tableDialog, t]);

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

  if (!datasource) {
    throw new Response('Not Found', { status: 404 });
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex shrink-0 flex-col gap-5 px-8 py-6 lg:px-16 lg:py-10">
          <Skeleton className="h-10 w-56 rounded-lg" />
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

  const renameSubmitEnabled =
    tableDialog?.kind === 'rename' &&
    renameTableInput.trim().length > 0 &&
    renameTableInput.trim() !== tableDialog.table.tableName;

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-col gap-6 px-8 py-6 lg:px-16 lg:py-10">
        <div className="flex items-center justify-between">
          <h1 className="text-4xl font-bold tracking-tight">
            {t('datasource.tables.title', { defaultValue: 'Tables' })}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-muted/30 border-border/50 focus-within:border-border flex h-12 flex-1 items-center gap-3 rounded-xl border px-4 transition-all focus-within:bg-transparent">
            <MagnifyingGlassIcon className="text-muted-foreground/60 h-5 w-5 shrink-0" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder={t('datasource.tables.search.placeholder', {
                defaultValue: 'Search tables...',
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
                      setVisibleColumns(['name']); // Keep at least name
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

          {schemas.length > 0 && (
            <Select value={selectedSchema} onValueChange={handleSchemaChange}>
              <SelectTrigger className="bg-muted/30 border-border/50 hover:bg-muted flex h-12 w-[170px] items-center gap-3 rounded-xl border px-4 transition-all focus:ring-0 focus-visible:ring-0">
                <Filter className="text-muted-foreground/60 h-5 w-5 shrink-0" />
                <SelectValue
                  placeholder="Select Schema"
                  className="text-sm font-medium"
                >
                  {selectedSchema === 'all'
                    ? t('datasource.tables.filter.all', {
                        defaultValue: 'All Schemas',
                      })
                    : selectedSchema}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t('datasource.tables.filter.all', {
                    defaultValue: 'All Schemas',
                  })}
                </SelectItem>
                {schemas.map((schema) => (
                  <SelectItem key={schema} value={schema}>
                    {schema}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <div className="flex h-full flex-col px-8 py-6 lg:px-16 lg:py-6">
          <div className="min-h-0 flex-1">
            <DevProfiler id="DatasourceTables/Tables">
              <Tables
                tables={pagedItems}
                onTableClick={handleTableClick}
                onRenameTable={openRenameTable}
                onTruncateTable={openTruncateTable}
                onDeleteTable={openDeleteTable}
                searchQuery={searchQuery}
                visibleColumns={visibleColumns}
                showSchema={selectedSchema === 'all'}
                className="mb-0 h-full"
              />
            </DevProfiler>
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
        open={tableDialog?.kind === 'rename'}
        onOpenChange={(open) => {
          if (!open) setTableDialog(null);
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
            value={renameTableInput}
            onChange={(e) => setRenameTableInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && renameSubmitEnabled && !isMutating) {
                void confirmRenameTable();
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
              onClick={() => setTableDialog(null)}
            >
              {t('common.actions.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              type="button"
              disabled={isMutating || !renameSubmitEnabled}
              onClick={() => void confirmRenameTable()}
            >
              {isMutating && tableDialog?.kind === 'rename' ? (
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
          tableDialog?.kind === 'truncate' || tableDialog?.kind === 'delete'
        }
        onOpenChange={(open) => {
          if (!open) setTableDialog(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {tableDialog?.kind === 'truncate'
                ? t('datasource.tables.dialog.truncate.title', {
                    defaultValue: 'Truncate table?',
                  })
                : t('datasource.tables.dialog.delete.title', {
                    defaultValue: 'Delete table?',
                  })}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {tableDialog?.kind === 'truncate'
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
                tableDialog?.kind === 'delete' ? 'destructive' : 'default'
              }
              onClick={() => void confirmDestructiveTable()}
            >
              {isMutating &&
              (tableDialog?.kind === 'truncate' ||
                tableDialog?.kind === 'delete') ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : tableDialog?.kind === 'truncate' ? (
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
