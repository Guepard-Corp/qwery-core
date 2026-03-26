import React, { type CSSProperties } from 'react';
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
import { Columns2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

export interface ColumnListItem {
  name: string;
  description: string | null;
  dataType: string;
  format: string;
}

export type ColumnColumn = 'name' | 'description' | 'type' | 'actions';

/** All column-detail table keys, in default display order. */
export const ALL_COLUMN_COLUMNS = [
  'name',
  'description',
  'type',
  'actions',
] as const satisfies readonly ColumnColumn[];

export const DEFAULT_VISIBLE_COLUMN_COLUMNS: ColumnColumn[] = [
  ...ALL_COLUMN_COLUMNS,
];

export interface ColumnsProps {
  columns: ColumnListItem[];
  onColumnClick?: (column: ColumnListItem) => void;
  onRenameColumn?: (column: ColumnListItem) => void;
  onDeleteColumn?: (column: ColumnListItem) => void;
  className?: string;
  searchQuery?: string;
  visibleColumns?: ColumnColumn[];
}

export function Columns({
  columns,
  onColumnClick,
  onRenameColumn,
  onDeleteColumn,
  className,
  searchQuery = '',
  visibleColumns = DEFAULT_VISIBLE_COLUMN_COLUMNS,
}: ColumnsProps) {
  const { t } = useTranslation();

  const isVisible = (column: ColumnColumn) => visibleColumns.includes(column);
  const orderedVisibleColumns = ALL_COLUMN_COLUMNS.filter((column) =>
    isVisible(column),
  );
  const getHeadCornerClassName = (column: ColumnColumn) =>
    cn(
      orderedVisibleColumns[0] === column && 'rounded-tl-xl',
      orderedVisibleColumns[orderedVisibleColumns.length - 1] === column &&
        'rounded-tr-xl',
    );
  const getColumnWidthStyle = (
    column: ColumnColumn,
  ): CSSProperties | undefined => {
    switch (column) {
      case 'type':
        return { width: 180 };
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

  if (columns.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-20 text-center',
          className,
        )}
      >
        <div className="bg-muted/50 mb-4 rounded-full p-4">
          <Columns2 className="text-muted-foreground/40 h-8 w-8" />
        </div>
        <p className="text-foreground mb-1 font-medium">
          {t('datasource.columns.list.empty', {
            defaultValue: 'No columns found',
          })}
        </p>
        <p className="text-muted-foreground text-sm">
          {searchQuery
            ? t('datasource.columns.list.search_empty', {
                defaultValue: 'Try adjusting your search query',
              })
            : t('datasource.columns.list.empty_description', {
                defaultValue: "We couldn't find any columns in this table",
              })}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'bg-card border-border/50 relative mb-6 flex h-full min-h-0 flex-col overflow-hidden rounded-xl border shadow-sm',
        className,
      )}
    >
      <Table className="w-full table-fixed">
        {renderColGroup()}
        <TableHeader className="bg-muted/50 border-b">
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {isVisible('name') && (
              <TableHead
                className={cn(
                  'py-4 pl-6 font-semibold',
                  getHeadCornerClassName('name'),
                )}
              >
                {t('datasource.columns.header.name', {
                  defaultValue: 'Column Name',
                })}
              </TableHead>
            )}
            {isVisible('description') && (
              <TableHead
                className={cn(
                  'py-4 font-semibold',
                  getHeadCornerClassName('description'),
                )}
              >
                {t('datasource.columns.header.description', {
                  defaultValue: 'Description',
                })}
              </TableHead>
            )}
            {isVisible('type') && (
              <TableHead
                className={cn(
                  'py-4 pr-6 text-right font-semibold',
                  getHeadCornerClassName('type'),
                )}
              >
                {t('datasource.columns.header.dataType', {
                  defaultValue: 'Type & Format',
                })}
              </TableHead>
            )}
            {isVisible('actions') && (
              <TableHead
                className={cn(
                  'py-4 pr-6 text-right font-semibold',
                  getHeadCornerClassName('actions'),
                )}
              >
                {t('datasource.columns.header.actions', {
                  defaultValue: 'Actions',
                })}
              </TableHead>
            )}
          </TableRow>
        </TableHeader>
      </Table>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table className="w-full table-fixed">
          {renderColGroup()}
          <TableBody>
            {columns.map((column, index) => (
              <TableRow
                key={`${column.name}-${index}`}
                className={cn(
                  'group h-14 transition-colors',
                  onColumnClick
                    ? 'hover:bg-muted/30 cursor-pointer'
                    : undefined,
                )}
                onClick={() => onColumnClick?.(column)}
                data-test={`column-row-${column.name}`}
              >
                {isVisible('name') && (
                  <TableCell className="py-3 pl-6 text-base font-semibold">
                    {highlightMatch(column.name, searchQuery)}
                  </TableCell>
                )}
                {isVisible('description') && (
                  <TableCell className="py-3">
                    <span className="text-muted-foreground line-clamp-1 text-base">
                      {column.description || (
                        <span className="text-muted-foreground/30 italic">
                          {t('datasource.columns.noDescription', {
                            defaultValue: 'No description provided',
                          })}
                        </span>
                      )}
                    </span>
                  </TableCell>
                )}
                {isVisible('type') && (
                  <TableCell className="py-3 pr-6">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex w-full items-center justify-end gap-1.5">
                        <code className="text-foreground bg-muted/60 border-border/50 rounded border px-1.5 py-0.5 font-mono text-sm font-medium">
                          {column.dataType}
                        </code>
                      </div>
                      {column.format &&
                        column.format.toLowerCase() !==
                          column.dataType.toLowerCase() && (
                          <span className="text-muted-foreground/60 pr-1 font-mono text-[10px] italic">
                            {column.format}
                          </span>
                        )}
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
                            {t('datasource.columns.actions.open', {
                              defaultValue: 'Open column actions',
                            })}
                          </span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuItem
                          disabled={!onRenameColumn}
                          onClick={() => onRenameColumn?.(column)}
                        >
                          <Pencil className="mr-2 h-4 w-4" aria-hidden />
                          {t('datasource.columns.actions.rename', {
                            defaultValue: 'Rename',
                          })}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive dark:text-red-300 dark:focus:text-red-300"
                          disabled={!onDeleteColumn}
                          onClick={() => onDeleteColumn?.(column)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                          {t('datasource.columns.actions.delete', {
                            defaultValue: 'Delete',
                          })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
