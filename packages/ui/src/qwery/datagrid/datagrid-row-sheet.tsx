'use client';

import * as React from 'react';
import type { ColumnHeader, DatasourceRow } from '@qwery/domain/entities';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '../../shadcn/sheet';
import { Textarea } from '../../shadcn/textarea';
import { formatCellValue, isDateTimeColumn } from './datagrid-cell';
import { cn } from '../../lib/utils';

function isJsonColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return type === 'json' || type === 'jsonb' || type.includes('json');
}

function isLongTextColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return (
    type === 'string' ||
    type === 'text' ||
    type.includes('varchar') ||
    type.includes('text')
  );
}

export interface DataGridRowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: DatasourceRow | null;
  columns: ColumnHeader[];
  rowIndex: number;
}

export function DataGridRowSheet({
  open,
  onOpenChange,
  row,
  columns,
  rowIndex,
}: DataGridRowSheetProps) {
  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full max-w-2xl flex-col sm:max-w-2xl"
      >
        <SheetHeader>
          <SheetTitle>Row {rowIndex + 1}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex-1 space-y-4 overflow-y-auto">
          {columns.map((column) => {
            const value = row[column.name];
            const formattedValue = formatCellValue(value, column);
            const isNull = value === null || value === undefined;
            const isJson = isJsonColumn(column);
            const isLongText =
              isLongTextColumn(column) &&
              typeof formattedValue === 'string' &&
              formattedValue.length > 64;
            const isObject = typeof value === 'object' && value !== null;

            return (
              <div
                key={column.name}
                className="flex flex-col gap-2 border-b border-white/10 pb-4 last:border-0"
              >
                <label className="text-muted-foreground text-xs font-medium">
                  {column.displayName || column.name}
                </label>
                {isNull ? (
                  <span className="text-muted-foreground italic">null</span>
                ) : isJson || isObject ? (
                  <Textarea
                    readOnly
                    className={cn(
                      'min-h-[120px] font-mono text-xs',
                      isDateTimeColumn(column) && 'text-violet-400',
                    )}
                    value={
                      typeof value === 'object' && value !== null
                        ? JSON.stringify(value, null, 2)
                        : formattedValue
                    }
                  />
                ) : isLongText ? (
                  <Textarea
                    readOnly
                    className="min-h-[80px] text-sm"
                    value={formattedValue}
                  />
                ) : (
                  <span className="text-sm break-words">{formattedValue}</span>
                )}
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
