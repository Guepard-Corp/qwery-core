'use client';

import * as React from 'react';

import { Clock, Type } from 'lucide-react';

import type {
  DatasourceHeader,
  DatasourceResultSet,
  DatasourceRow,
} from '@qwery/domain/entities';
import { ScrollArea } from '@qwery/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@qwery/ui/table';
import { cn } from '@qwery/ui/utils';

interface NotebookDataGridProps {
  result: DatasourceResultSet;
  className?: string;
}

// Format duration in milliseconds to human-readable string
function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

// Format number with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Format cell value for display
function formatCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return String(value);
}

// Truncate text with ellipsis
function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

// Determine if a column is a date/time type
function isDateTimeColumn(header: {
  name: string;
  originalType?: string | null;
}): boolean {
  const name = header.name.toLowerCase();
  const type = header.originalType?.toLowerCase() || '';

  return (
    name.includes('date') ||
    name.includes('time') ||
    name.includes('timestamp') ||
    type.includes('date') ||
    type.includes('time') ||
    type.includes('timestamp')
  );
}

export function NotebookDataGrid({ result, className }: NotebookDataGridProps) {
  const { rows, headers, stat } = result;
  const displayedRows = rows.length;
  const totalRows = stat.rowsRead ?? displayedRows;
  const duration = formatDuration(stat.queryDurationMs);

  return (
    <div
      className={cn(
        'bg-background flex h-full flex-col overflow-hidden',
        className,
      )}
    >
      {/* Metadata header */}
      <div className="border-border bg-background text-muted-foreground border-b px-4 py-2 text-sm">
        <span>
          {formatNumber(displayedRows)} of {formatNumber(totalRows)} rows
          returned in {duration}
        </span>
      </div>

      {/* Scrollable table */}
      <ScrollArea className="flex-1">
        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Row number column */}
                <TableHead className="bg-background border-border sticky left-0 z-10 w-12 min-w-12 border-r">
                  <span className="text-muted-foreground text-xs">#</span>
                </TableHead>
                {/* Data columns */}
                {headers.map((header: DatasourceHeader, index: number) => {
                  const isDateTime = isDateTimeColumn(header);
                  return (
                    <TableHead
                      key={header.name}
                      className={cn(
                        'bg-background',
                        index === 0 && 'border-border border-l',
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        {isDateTime ? (
                          <Clock className="text-muted-foreground h-3.5 w-3.5" />
                        ) : (
                          <Type className="text-muted-foreground h-3.5 w-3.5" />
                        )}
                        <span className="font-medium">
                          {header.displayName || header.name}
                        </span>
                      </div>
                    </TableHead>
                  );
                })}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={headers.length + 1}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No rows returned
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row: DatasourceRow, rowIndex: number) => (
                  <TableRow key={rowIndex} className="hover:bg-muted/50">
                    {/* Row number */}
                    <TableCell className="bg-background border-border text-muted-foreground sticky left-0 z-10 w-12 min-w-12 border-r text-xs tabular-nums">
                      {rowIndex + 1}
                    </TableCell>
                    {/* Data cells */}
                    {headers.map(
                      (header: DatasourceHeader, colIndex: number) => {
                        const value = row[header.name];
                        const formattedValue = formatCellValue(value);
                        const isNull = value === null || value === undefined;
                        const displayValue = isNull
                          ? 'NULL'
                          : truncateText(formattedValue);

                        return (
                          <TableCell
                            key={header.name}
                            className={cn(
                              'max-w-[300px]',
                              colIndex === 0 && 'border-border border-l',
                              isNull && 'text-muted-foreground italic',
                            )}
                            title={isNull ? 'NULL' : formattedValue}
                          >
                            <div className="truncate" title={formattedValue}>
                              {displayValue}
                            </div>
                          </TableCell>
                        );
                      },
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}
