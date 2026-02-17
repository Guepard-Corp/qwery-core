'use client';

import * as React from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import type { ColumnHeader, DatasourceRow } from '@qwery/domain/entities';
import { cn } from '../../lib/utils';
import { DataGridCell, formatCellValue } from './datagrid-cell';
import { DataGridRowSheet } from './datagrid-row-sheet';
import { useColumnWidths } from './use-column-widths';
import { DataGridHeader } from './datagrid-header';

export interface DataGridProps {
  columns: ColumnHeader[];
  rows: DatasourceRow[];
  className?: string;
  pageSize?: number;
  stat?: {
    rowsRead?: number | null;
    queryDurationMs?: number | null;
  };
  showRowNumbers?: boolean;
  showHeader?: boolean;
  title?: string;
  onDownloadCSV?: () => void;
  onCopyPage?: () => void;
}

function rowsToCSV(
  columns: ColumnHeader[],
  rows: DatasourceRow[],
  formatValue: (value: unknown, column: ColumnHeader) => string,
): string {
  const escape = (s: string) =>
    s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  const header = columns.map((c) => escape(c.displayName || c.name)).join(',');
  const dataRows = rows.map((row) =>
    columns.map((col) => escape(formatValue(row[col.name], col))).join(','),
  );
  return [header, ...dataRows].join('\n');
}

function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

export function DataGrid({
  columns,
  rows,
  className,
  pageSize,
  stat,
  showRowNumbers = false,
  showHeader = true,
  title,
  onDownloadCSV,
  onCopyPage,
}: DataGridProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [selectedRow, setSelectedRow] = React.useState<DatasourceRow | null>(
    null,
  );
  const [selectedRowIndex, setSelectedRowIndex] = React.useState(0);

  const columnWidths = useColumnWidths(columns, rows, showRowNumbers);

  const effectivePageSize = pageSize || rows.length;
  const totalPages = Math.ceil(rows.length / effectivePageSize);
  const page = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;
  const startIndex = (page - 1) * effectivePageSize;
  const endIndex = startIndex + effectivePageSize;
  const currentRows = pageSize ? rows.slice(startIndex, endIndex) : rows;

  // Prefer rows.length when stat.rowsRead is wrong (e.g. some drivers report 1)
  const totalRows = Math.max(stat?.rowsRead ?? 0, rows.length) || rows.length;
  const duration = formatDuration(stat?.queryDurationMs);

  const prevRowsLengthRef = React.useRef(rows.length);
  React.useEffect(() => {
    if (prevRowsLengthRef.current !== rows.length) {
      prevRowsLengthRef.current = rows.length;
      if (currentPage > totalPages && totalPages > 0) {
        queueMicrotask(() => {
          setCurrentPage(1);
        });
      }
    }
  }, [rows.length, currentPage, totalPages]);

  if (!columns.length) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No columns to display
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No data to display
      </div>
    );
  }

  const handleCopyPage =
    onCopyPage ??
    (() => {
      const csv = rowsToCSV(columns, currentRows, formatCellValue);
      void navigator.clipboard.writeText(csv);
    });

  const showCustomHeader =
    showHeader && (title || stat || onDownloadCSV || onCopyPage);

  return (
    <div
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-md border border-white/10',
        className,
      )}
    >
      {showCustomHeader && (
        <DataGridHeader
          title={title}
          totalRows={totalRows}
          duration={duration}
          onDownloadCSV={onDownloadCSV}
          onCopyPage={handleCopyPage}
        />
      )}

      <div className="flex-1 overflow-hidden">
        <TableVirtuoso
          data={currentRows}
          computeItemKey={(index) => `row-${startIndex + index}`}
          components={{
            Table: ({ style, ...props }) => (
              <table
                {...props}
                style={{
                  ...style,
                  width: '100%',
                  tableLayout: 'fixed',
                  borderCollapse: 'collapse',
                }}
                className="w-full caption-bottom text-sm"
              />
            ),
            TableHead: React.forwardRef(function DataGridTableHead(
              {
                style,
                ...props
              }: React.HTMLAttributes<HTMLTableSectionElement>,
              ref: React.Ref<HTMLTableSectionElement>,
            ) {
              return (
                <thead
                  ref={ref}
                  {...props}
                  style={{
                    ...style,
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                  }}
                  className="bg-black [&_tr]:border-b-4 [&_tr]:border-white/10"
                />
              );
            }),
            TableBody: React.forwardRef(function DataGridTableBody(
              props: React.HTMLAttributes<HTMLTableSectionElement>,
              ref: React.Ref<HTMLTableSectionElement>,
            ) {
              return (
                <tbody
                  ref={ref}
                  {...props}
                  className="[&_tr:last-child]:border-0"
                />
              );
            }),
            TableRow: ({
              item,
              ...props
            }: React.HTMLAttributes<HTMLTableRowElement> & {
              item?: DatasourceRow;
            }) => {
              const handleDoubleClick = () => {
                if (item) {
                  const index = currentRows.indexOf(item);
                  setSelectedRow(item);
                  setSelectedRowIndex(index >= 0 ? startIndex + index : 0);
                  setSheetOpen(true);
                }
              };
              return (
                <tr
                  {...props}
                  className="group cursor-pointer border-b border-white/10 transition-colors [&:nth-child(odd)]:bg-black/20"
                  onDoubleClick={handleDoubleClick}
                />
              );
            },
          }}
          fixedHeaderContent={() => (
            <tr>
              {showRowNumbers && (
                <th
                  className="sticky left-0 z-20 h-10 border-r border-white/10 bg-black px-2 text-left align-middle text-xs font-semibold text-white/90"
                  style={{
                    width: columnWidths[0],
                    minWidth: columnWidths[0],
                    maxWidth: columnWidths[0],
                  }}
                >
                  #
                </th>
              )}
              {columns.map((column, colIndex) => {
                const widthIndex = showRowNumbers ? colIndex + 1 : colIndex;
                const isLastColumn = colIndex === columns.length - 1;
                return (
                  <th
                    key={column.name}
                    className={cn(
                      'h-10 bg-black px-2 text-left align-middle font-semibold text-white/90',
                      !isLastColumn && 'border-r border-white/10',
                    )}
                    style={{ width: columnWidths[widthIndex] }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">
                        {column.displayName || column.name}
                      </span>
                    </div>
                  </th>
                );
              })}
            </tr>
          )}
          itemContent={(index, row) => (
            <>
              {showRowNumbers && (
                <td
                  className="text-muted-foreground sticky left-0 z-10 border-r border-white/10 bg-inherit p-2 text-xs tabular-nums transition-colors group-hover:bg-white/5 hover:bg-white/15"
                  style={{
                    width: columnWidths[0],
                    minWidth: columnWidths[0],
                    maxWidth: columnWidths[0],
                  }}
                >
                  {startIndex + index + 1}
                </td>
              )}
              {columns.map((column, colIndex) => {
                const value = row[column.name];
                const widthIndex = showRowNumbers ? colIndex + 1 : colIndex;
                return (
                  <DataGridCell
                    key={column.name}
                    value={value}
                    column={column}
                    style={{ width: columnWidths[widthIndex] }}
                    className="bg-inherit group-hover:bg-white/5 hover:bg-white/15"
                  />
                );
              })}
            </>
          )}
        />
      </div>

      <DataGridRowSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        row={selectedRow}
        columns={columns}
        rowIndex={selectedRowIndex}
      />

      {pageSize && totalPages > 1 && (
        <div className="flex items-center justify-center gap-1 border-t py-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-muted-foreground hover:bg-muted disabled:text-muted-foreground/40 h-7 w-7 cursor-pointer rounded disabled:cursor-not-allowed"
          >
            ←
          </button>
          <span className="text-muted-foreground min-w-[60px] text-center text-xs tabular-nums">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-muted-foreground hover:bg-muted disabled:text-muted-foreground/40 h-7 w-7 cursor-pointer rounded disabled:cursor-not-allowed"
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
