'use client';

import * as React from 'react';
import type { ColumnHeader } from '@qwery/domain/entities';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../shadcn/tooltip';
import { TableCell } from '../../shadcn/table';
import { cn } from '../../lib/utils';

const MAX_DISPLAY_CHARS = 32;

interface DataGridCellProps {
  value: unknown;
  column: ColumnHeader;
  className?: string;
  style?: React.CSSProperties;
}

function truncateForDisplay(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars) + '…';
}

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

function isISOString(value: string): boolean {
  const isoRegex =
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/;
  return isoRegex.test(value);
}

export function isDateTimeColumn(column: ColumnHeader): boolean {
  const name = column.name.toLowerCase();
  const type = (column.type || column.originalType || '').toLowerCase();

  if (
    column.type === 'date' ||
    column.type === 'datetime' ||
    column.type === 'timestamp' ||
    column.type === 'time'
  ) {
    return true;
  }

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

export function formatCellValue(value: unknown, column: ColumnHeader): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  if (typeof value === 'string') {
    if (isISOString(value) || isDateTimeColumn(column)) {
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
    return value ? '✓' : '✗';
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function isNumericOriginalType(
  originalType: string | null | undefined,
): boolean {
  if (!originalType) return false;
  const t = originalType.toUpperCase();
  return (
    t.includes('INT') ||
    t.includes('NUMERIC') ||
    t.includes('DECIMAL') ||
    t.includes('FLOAT') ||
    t.includes('DOUBLE') ||
    t.includes('REAL') ||
    t.includes('BIGINT') ||
    t.includes('SMALLINT') ||
    t.includes('TINYINT')
  );
}

function isNumericValue(value: unknown): boolean {
  if (typeof value === 'number' && !Number.isNaN(value)) return true;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return !Number.isNaN(n) && value.trim() !== '';
  }
  return false;
}

function isJsonColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return type === 'json' || type === 'jsonb' || type.includes('json');
}

function getCellClassName(value: unknown, column: ColumnHeader): string {
  const isNull = value === null || value === undefined;
  const isDateTime = isDateTimeColumn(column);
  const isNumber =
    typeof value === 'number' ||
    column.type === 'number' ||
    column.type === 'integer' ||
    column.type === 'float' ||
    column.type === 'decimal' ||
    (isNumericOriginalType(column.originalType) && isNumericValue(value));
  const isBoolean = typeof value === 'boolean' || column.type === 'boolean';
  const isJson =
    (typeof value === 'object' && value !== null) || isJsonColumn(column);

  // Match Datakit: numbers=emerald, booleans=cyan, dates=violet, json=amber
  return cn(
    isNull && 'text-white/30 italic',
    isDateTime && 'whitespace-nowrap text-violet-400',
    isNumber && 'text-right font-mono text-emerald-400 tabular-nums',
    isBoolean && 'text-center text-cyan-400',
    isJson && 'font-mono text-amber-400',
  );
}

export function DataGridCell({
  value,
  column,
  className,
  style,
}: DataGridCellProps) {
  const cellRef = React.useRef<HTMLTableCellElement>(null);
  const [isTruncated, setIsTruncated] = React.useState(false);

  const formattedValue = formatCellValue(value, column);
  const isNull = value === null || value === undefined;

  const displayValue =
    typeof formattedValue === 'string' &&
    formattedValue.length > MAX_DISPLAY_CHARS
      ? truncateForDisplay(formattedValue, MAX_DISPLAY_CHARS)
      : formattedValue;

  const isTruncatedInGrid =
    typeof formattedValue === 'string' &&
    formattedValue.length > MAX_DISPLAY_CHARS;

  React.useEffect(() => {
    const checkIfTruncated = () => {
      if (cellRef.current) {
        const element = cellRef.current.querySelector('[data-cell-content]');
        if (element) {
          setIsTruncated(element.scrollWidth > element.clientWidth);
        }
      }
    };

    requestAnimationFrame(checkIfTruncated);

    const handleResize = () => {
      requestAnimationFrame(checkIfTruncated);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [value]);

  const cellContent = (
    <div
      data-cell-content
      className={cn('truncate', getCellClassName(value, column))}
      title={formattedValue}
    >
      {isNull ? (
        <span className="text-white/30 italic">null</span>
      ) : (
        displayValue
      )}
    </div>
  );

  const showTooltip = isTruncated || isTruncatedInGrid;

  return (
    <TableCell
      ref={cellRef}
      className={cn(
        'overflow-hidden border-r border-b border-white/10 p-2 transition-colors group-hover:bg-white/5 hover:bg-white/15',
        className,
      )}
      style={style}
    >
      {showTooltip ? (
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>{cellContent}</TooltipTrigger>
            <TooltipContent className="max-w-md break-words">
              <pre className="text-xs whitespace-pre-wrap">
                {typeof value === 'object' && value !== null
                  ? JSON.stringify(value, null, 2)
                  : formattedValue}
              </pre>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        cellContent
      )}
    </TableCell>
  );
}
