import type { QueryResult } from '@qwery/domain';
import { Box, Text } from 'ink';

const MAX_CELL_WIDTH = 32;
const MAX_VISIBLE_ROWS = 20;
const MAX_VISIBLE_COLS = 8;

export function fmtCell(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return JSON.stringify(v);
}

export function truncateCell(s: string, w: number): string {
  if (s.length <= w) return s;
  return `${s.slice(0, Math.max(1, w - 1))}…`;
}

export interface TablePlan {
  /** Visible columns, with a `…` placeholder column when truncated for width. */
  cols: string[];
  /** Render width per visible column (excludes the 2-space cell padding). */
  widths: number[];
  /** Visible rows, with a `…` placeholder row when truncated for height. */
  rowSlice: (Record<string, unknown> | '…')[];
  /** DuckDB-CLI-style summary footer (ADR U5). */
  footer: string;
}

/**
 * Decide which rows/columns to show and how wide each column is, applying the
 * DuckDB-CLI-inspired caps from ADR U5 (`…` between first and last when too
 * wide/tall). Shared by the {@link Table} component and the chat line-flattener
 * so both stay consistent and the truncation rules live in one place.
 */
export function planTable(result: QueryResult): TablePlan {
  const allCols = result.columns;
  const showAllCols = allCols.length <= MAX_VISIBLE_COLS;
  const cols = showAllCols
    ? allCols
    : [...allCols.slice(0, MAX_VISIBLE_COLS - 2), '…', allCols[allCols.length - 1]!];

  const allRows = result.rows;
  const showAllRows = result.rowCount <= MAX_VISIBLE_ROWS;
  const rowSlice: (Record<string, unknown> | '…')[] = showAllRows
    ? allRows
    : [...allRows.slice(0, MAX_VISIBLE_ROWS - 2), '…' as const, allRows[allRows.length - 1]!];

  const widths = cols.map((c) => {
    if (c === '…') return 1;
    const bodyW = rowSlice.reduce(
      (max, r) => (r === '…' ? max : Math.max(max, fmtCell(r[c]).length)),
      c.length,
    );
    return Math.min(MAX_CELL_WIDTH, bodyW);
  });

  const footer =
    `${result.rowCount} row${result.rowCount === 1 ? '' : 's'} · ${result.columns.length} column` +
    `${result.columns.length === 1 ? '' : 's'} · ${result.durationMs} ms` +
    (showAllCols ? '' : ` · showing ${MAX_VISIBLE_COLS} of ${allCols.length} columns`) +
    (showAllRows ? '' : ` · showing first ${MAX_VISIBLE_ROWS - 2} + last of ${result.rowCount} rows`);

  return { cols, widths, rowSlice, footer };
}

export function Table({ result }: { result: QueryResult }) {
  if (result.rowCount === 0) {
    return <Text dimColor>(0 rows · {result.durationMs} ms)</Text>;
  }

  const { cols, widths, rowSlice, footer } = planTable(result);

  return (
    <Box flexDirection="column">
      <Box>
        {cols.map((c, i) => (
          <Box key={`h-${i}`} width={widths[i]! + 2}>
            <Text bold color="cyan">
              {truncateCell(c, widths[i]!)}
            </Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>{cols.map((_, i) => '─'.repeat(widths[i]! + 2)).join('')}</Text>
      {rowSlice.map((r, ri) =>
        r === '…' ? (
          <Text key={`r-${ri}`} dimColor>
            …
          </Text>
        ) : (
          <Box key={`r-${ri}`}>
            {cols.map((c: string, i: number) => (
              <Box key={`c-${ri}-${i}`} width={widths[i]! + 2}>
                <Text>{c === '…' ? '…' : truncateCell(fmtCell(r[c]), widths[i]!)}</Text>
              </Box>
            ))}
          </Box>
        ),
      )}
      <Text dimColor>{footer}</Text>
    </Box>
  );
}
