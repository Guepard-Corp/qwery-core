import React, { memo, type CSSProperties } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shadcn/table';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';
import {
  Database,
  MoreHorizontal,
  Pencil,
  Scissors,
  Trash2,
} from 'lucide-react';
import { Button } from '../../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

export interface TableListItem {
  tableName: string;
  schema: string;
  description: string | null;
  rowsEstimated: number;
  sizeEstimated: string | null;
  numberOfColumns: number;
}

export type TableColumn =
  | 'name'
  | 'description'
  | 'columns'
  | 'rows'
  | 'actions';

/** All table column keys, in default display order. */
export const ALL_TABLE_COLUMNS = [
  'name',
  'description',
  'columns',
  'rows',
  'actions',
] as const satisfies readonly TableColumn[];

export const DEFAULT_VISIBLE_TABLE_COLUMNS: TableColumn[] = [
  ...ALL_TABLE_COLUMNS,
];

export interface TablesProps {
  tables: TableListItem[];
  onTableClick?: (table: TableListItem) => void;
  onRenameTable?: (table: TableListItem) => void;
  onTruncateTable?: (table: TableListItem) => void;
  onDeleteTable?: (table: TableListItem) => void;
  className?: string;
  searchQuery?: string;
  visibleColumns?: TableColumn[];
  showSchema?: boolean;
}

const ROW_HEIGHT = 64; // Increased for better spacing

export const Tables = memo(function Tables({
  tables,
  onTableClick,
  onRenameTable,
  onTruncateTable,
  onDeleteTable,
  className,
  searchQuery = '',
  visibleColumns = DEFAULT_VISIBLE_TABLE_COLUMNS,
  showSchema = true,
}: TablesProps) {
  const { t } = useTranslation();

  const isVisible = (column: TableColumn) => visibleColumns.includes(column);
  const orderedVisibleColumns = ALL_TABLE_COLUMNS.filter((column) =>
    isVisible(column),
  );
  const getHeadCornerClassName = (column: TableColumn) =>
    cn(
      orderedVisibleColumns[0] === column && 'rounded-tl-xl',
      orderedVisibleColumns[orderedVisibleColumns.length - 1] === column &&
        'rounded-tr-xl',
    );
  const getColumnWidthStyle = (
    column: TableColumn,
  ): CSSProperties | undefined => {
    switch (column) {
      case 'columns':
        return { width: 100 };
      case 'rows':
        return { width: 140 };
      case 'actions':
        return { width: 100 };
      default:
        return undefined;
    }
  };
  const renderColGroup = () => (
    <colgroup>
      {orderedVisibleColumns.map((column) => (
        <col key={column} style={getColumnWidthStyle(column)} />
      ))}
    </colgroup>
  );

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <span
              key={i}
              className="rounded-sm bg-[#ffcb51]/20 px-0.5 font-semibold text-[#ffcb51]"
            >
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </span>
    );
  };

  if (tables.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-20 text-center',
          className,
        )}
      >
        <div className="bg-muted/50 mb-4 rounded-full p-4">
          <Database className="text-muted-foreground/40 h-8 w-8" />
        </div>
        <p className="text-foreground mb-1 font-medium">
          {t('datasource.tables.list.empty', {
            defaultValue: 'No tables found',
          })}
        </p>
        <p className="text-muted-foreground max-w-xs text-sm">
          {searchQuery
            ? t('datasource.tables.list.search_empty', {
                defaultValue: 'Try adjusting your search query',
              })
            : t('datasource.tables.list.empty_description', {
                defaultValue: "We couldn't find any tables in this datasource",
              })}
        </p>
      </div>
    );
  }

  const tableHeader = () => (
    <TableHeader className="bg-muted/50 border-b">
      <TableRow className="bg-muted/50 hover:bg-muted/50">
        {isVisible('name') && (
          <TableHead
            className={cn(
              'py-4 pl-6 font-semibold',
              getHeadCornerClassName('name'),
            )}
          >
            {t('datasource.tables.header.name', { defaultValue: 'Table Name' })}
          </TableHead>
        )}
        {isVisible('description') && (
          <TableHead
            className={cn(
              'py-4 font-semibold',
              getHeadCornerClassName('description'),
            )}
          >
            {t('datasource.tables.header.description', {
              defaultValue: 'Description',
            })}
          </TableHead>
        )}
        {isVisible('columns') && (
          <TableHead
            className={cn(
              'py-4 text-right font-semibold',
              getHeadCornerClassName('columns'),
            )}
          >
            {t('datasource.tables.header.columns', { defaultValue: 'Cols' })}
          </TableHead>
        )}
        {isVisible('rows') && (
          <TableHead
            className={cn(
              'py-4 text-right font-semibold',
              getHeadCornerClassName('rows'),
            )}
          >
            {t('datasource.tables.header.rows', { defaultValue: 'Rows' })}
          </TableHead>
        )}
        {isVisible('actions') && (
          <TableHead
            className={cn(
              'py-4 pr-6 text-right font-semibold',
              getHeadCornerClassName('actions'),
            )}
          >
            {t('datasource.tables.header.actions', { defaultValue: 'Actions' })}
          </TableHead>
        )}
      </TableRow>
    </TableHeader>
  );

  const renderRow = (_index: number, table: TableListItem) => (
    <TableRow
      key={`${table.schema}-${table.tableName}`}
      className={cn(
        'group transition-colors',
        onTableClick ? 'hover:bg-muted/30 cursor-pointer' : undefined,
      )}
      onClick={() => onTableClick?.(table)}
      data-test={`table-row-${table.schema}-${table.tableName}`}
      style={{ height: ROW_HEIGHT }}
    >
      {isVisible('name') && (
        <TableCell className="py-3 pl-6">
          <div className="flex items-center gap-3">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-base font-semibold">
                {highlightMatch(table.tableName, searchQuery)}
              </span>
              {showSchema && (
                <span className="text-muted-foreground/60 text-[10px] font-medium tracking-wider uppercase">
                  {table.schema || 'main'}
                </span>
              )}
            </div>
          </div>
        </TableCell>
      )}
      {isVisible('description') && (
        <TableCell className="py-3">
          <span className="text-muted-foreground line-clamp-1 max-w-md text-base">
            {table.description || (
              <span className="text-muted-foreground/30 italic">
                {t('datasource.tables.noDescription', {
                  defaultValue: 'No description',
                })}
              </span>
            )}
          </span>
        </TableCell>
      )}
      {isVisible('columns') && (
        <TableCell className="py-3 text-right">
          <span className="text-base font-medium">{table.numberOfColumns}</span>
        </TableCell>
      )}
      {isVisible('rows') && (
        <TableCell className="py-3 text-right">
          <div className="flex flex-col items-end">
            <span className="text-base font-semibold">
              {formatNumber(table.rowsEstimated)}
            </span>
          </div>
        </TableCell>
      )}
      {isVisible('actions') && (
        <TableCell className="py-3 pr-6 text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
                <span className="sr-only">
                  {t('datasource.tables.actions.open', {
                    defaultValue: 'Open table actions',
                  })}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                disabled={!onRenameTable}
                onClick={() => onRenameTable?.(table)}
              >
                <Pencil className="mr-2 h-4 w-4" aria-hidden />
                {t('datasource.tables.actions.rename', {
                  defaultValue: 'Rename',
                })}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!onTruncateTable}
                onClick={() => onTruncateTable?.(table)}
              >
                <Scissors className="mr-2 h-4 w-4" aria-hidden />
                {t('datasource.tables.actions.truncate', {
                  defaultValue: 'Truncate',
                })}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive dark:text-red-300 dark:focus:text-red-300"
                disabled={!onDeleteTable}
                onClick={() => onDeleteTable?.(table)}
              >
                <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                {t('datasource.tables.actions.delete', {
                  defaultValue: 'Delete',
                })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      )}
    </TableRow>
  );

  const containerClasses = cn(
    'bg-card border-border/50 relative mb-6 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm',
    className,
  );

  return (
    <div className={containerClasses}>
      <Table className="w-full table-fixed">
        {renderColGroup()}
        {tableHeader()}
      </Table>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table className="w-full table-fixed">
          {renderColGroup()}
          <TableBody>
            {tables.map((table, index) => renderRow(index, table))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
});
