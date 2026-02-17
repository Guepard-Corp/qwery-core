import { useMemo } from 'react';
import type { ColumnHeader, DatasourceRow } from '@qwery/domain/entities';
import { formatCellValue } from './datagrid-cell';

const MIN_WIDTH = 80;
const MAX_WIDTH = 280;
const CHAR_WIDTH = 8;
const PADDING = 24;
const ROW_NUMBER_WIDTH = 28;
const SAMPLE_SIZE = 100;
const MAX_DISPLAY_CHARS = 32;

function formatValueAsString(value: unknown, column: ColumnHeader): string {
  return formatCellValue(value, column);
}

function isTextLikeColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return (
    type === 'string' ||
    type === 'text' ||
    type === 'varchar' ||
    type === 'char' ||
    type.includes('varchar') ||
    type.includes('text')
  );
}

function isJsonColumn(column: ColumnHeader): boolean {
  const type = (column.type || column.originalType || '').toLowerCase();
  return type === 'json' || type === 'jsonb' || type.includes('json');
}

export function useColumnWidths(
  columns: ColumnHeader[],
  rows: DatasourceRow[],
  showRowNumbers = false,
): number[] {
  return useMemo(() => {
    if (!columns.length || !rows.length) {
      return columns.map(() => MIN_WIDTH);
    }

    const sampleSize = Math.min(rows.length, SAMPLE_SIZE);
    const sampledRows = rows.slice(0, sampleSize);

    const widths = columns.map((column) => {
      const isText = isTextLikeColumn(column);
      const isJson = isJsonColumn(column);
      const effectiveMaxChars = isText || isJson ? MAX_DISPLAY_CHARS : 20;

      let maxLength = Math.min(
        column.displayName?.length || column.name.length,
        effectiveMaxChars,
      );

      for (const row of sampledRows) {
        const value = row[column.name];
        const valueStr = formatValueAsString(value, column);
        maxLength = Math.max(
          maxLength,
          Math.min(valueStr.length, effectiveMaxChars),
        );
      }

      const estimatedWidth = maxLength * CHAR_WIDTH + PADDING;
      return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, estimatedWidth));
    });

    if (showRowNumbers) {
      return [ROW_NUMBER_WIDTH, ...widths];
    }

    return widths;
  }, [columns, rows, showRowNumbers]);
}
