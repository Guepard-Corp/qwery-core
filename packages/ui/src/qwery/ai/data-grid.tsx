'use client';

import { useState, useEffect, useRef } from 'react';
import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';

export interface DataGridColumn {
  key: string;
  name: string;
  width?: number;
}

export interface DataGridColumnHeader {
  displayName: string;
  name: string;
  originalType: string;
  type: string;
}

export interface DataGridProps {
  columns: DataGridColumnHeader[] | string[];
  rows: Array<Record<string, unknown>>;
  pageSize?: number;
  className?: string;
}

/**
 * Formats a date value for display
 */
function formatDate(date: Date): string {
  return (
    date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) +
    ' ' +
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  );
}

/**
 * Checks if a string is an ISO date string
 */
function isISOString(value: string): boolean {
  // Simple check for ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss
  const isoRegex =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(value);
}

/**
 * Formats a cell value for display, handling dates, nulls, and other types
 */
function formatCellValue(
  value: unknown,
  column?: DataGridColumnHeader | string,
): string {
  if (value === null || value === undefined) {
    return 'null';
  }
  if (value instanceof Date) {
    return formatDate(value);
  }
  if (typeof value === 'string') {
    if (isISOString(value) || (column && isDateTimeColumn(column))) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        // Not a valid date, return as-is
      }
    }
    return value;
  }
  if (typeof value === 'number') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  if (typeof value === 'object') {
    if (
      'toISOString' in value &&
      typeof (value as { toISOString?: () => string }).toISOString ===
        'function'
    ) {
      try {
        const date = new Date(
          (value as { toISOString: () => string }).toISOString(),
        );
        if (!isNaN(date.getTime())) {
          return formatDate(date);
        }
      } catch {
        // Fall through to JSON.stringify
      }
    }
    // For other objects, try JSON.stringify
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * Checks if a column suggests it's a date/time column
 */
function isDateTimeColumn(
  column: DataGridColumnHeader | string | unknown,
): boolean {
  if (typeof column === 'string') {
    const name = column.toLowerCase();
    return (
      name.includes('date') ||
      name.includes('time') ||
      name.includes('timestamp') ||
      name.includes('created_at') ||
      name.includes('updated_at')
    );
  }
  if (typeof column === 'object' && column !== null && 'name' in column) {
    const col = column as DataGridColumnHeader;
    const name = col.name.toLowerCase();
    const type = (col.type || col.originalType || '').toLowerCase();
    // Check normalized type first (more reliable)
    if (
      col.type === 'date' ||
      col.type === 'datetime' ||
      col.type === 'timestamp' ||
      col.type === 'time'
    ) {
      return true;
    }
    // Fallback to name and originalType checks
    return (
      name.includes('date') ||
      name.includes('time') ||
      name.includes('timestamp') ||
      name.includes('created_at') ||
      name.includes('updated_at') ||
      type.includes('date') ||
      type.includes('time') ||
      type.includes('timestamp')
    );
  }
  return false;
}

/**
 * Minimal paginated data grid component for displaying SQL query results
 * Uses simple pagination to avoid browser overload with thousands of rows
 */
export function DataGrid({
  columns,
  rows,
  pageSize = 50,
  className,
}: DataGridProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Normalize columns: convert string[] to DataGridColumnHeader[]
  const normalizedColumns: DataGridColumnHeader[] = columns.map((col) => {
    if (typeof col === 'string') {
      return {
        displayName: col,
        name: col,
        originalType: '',
        type: 'unknown',
      };
    }
    return col;
  });

  const totalPages = Math.ceil(rows.length / pageSize);

  // Reset to page 1 when data changes - use derived state instead of effect
  const page = currentPage > totalPages && totalPages > 0 ? 1 : currentPage;

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentRows = rows.slice(startIndex, endIndex);

  // Update page state when rows change (but not during render)
  const prevRowsLengthRef = useRef(rows.length);
  useEffect(() => {
    if (prevRowsLengthRef.current !== rows.length) {
      prevRowsLengthRef.current = rows.length;
      if (currentPage > totalPages && totalPages > 0) {
        // Use queueMicrotask to avoid setState in effect
        queueMicrotask(() => {
          setCurrentPage(1);
        });
      }
    }
  }, [rows.length, currentPage, totalPages]);

  if (rows.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No results found
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Data Grid */}
      <div className="bg-muted/50 max-w-full min-w-0 overflow-hidden rounded-md">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/30 border-b">
                {normalizedColumns.map((column) => (
                  <th
                    key={column.name}
                    className="text-muted-foreground px-4 py-2 text-left text-xs font-medium whitespace-nowrap"
                  >
                    {column.displayName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row, rowIndex) => (
                <tr
                  key={startIndex + rowIndex}
                  className="hover:bg-muted/20 border-b transition-colors"
                >
                  {normalizedColumns.map((column) => {
                    const value = row[column.name];
                    const formattedValue = formatCellValue(value, column);
                    const isNull = value === null || value === undefined;
                    const isDateColumn = isDateTimeColumn(column);

                    return (
                      <td
                        key={column.name}
                        className={cn(
                          'px-4 py-2 text-sm',
                          isDateColumn
                            ? 'whitespace-nowrap'
                            : 'whitespace-normal',
                          isNull && 'text-muted-foreground italic',
                        )}
                        title={isNull ? 'null' : formattedValue}
                      >
                        {isNull ? (
                          <span className="text-muted-foreground italic">
                            null
                          </span>
                        ) : (
                          <div
                            className={cn(
                              isDateColumn
                                ? 'whitespace-nowrap'
                                : 'break-words',
                            )}
                          >
                            {formattedValue}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-4 px-2">
          <div className="text-muted-foreground text-xs">
            Showing {startIndex + 1} to {Math.min(endIndex, rows.length)} of{' '}
            {rows.length} rows
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-7 gap-1"
            >
              <ChevronLeft className="h-3 w-3" />
              <span className="text-xs">Previous</span>
            </Button>
            <div className="text-muted-foreground min-w-[80px] text-center text-xs">
              Page {page} of {totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-7 gap-1"
            >
              <span className="text-xs">Next</span>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
