import type { QueryResult } from '@qwery/domain';
import { Box, Text } from 'ink';

const MAX_CELL_WIDTH = 32;
const MAX_VISIBLE_ROWS = 20;
const MAX_VISIBLE_COLS = 8;

function fmt(v: unknown): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  return JSON.stringify(v);
}

function truncate(s: string, w: number): string {
  if (s.length <= w) return s;
  return `${s.slice(0, Math.max(1, w - 1))}…`;
}

export function Table({ result }: { result: QueryResult }) {
  if (result.rowCount === 0) {
    return <Text dimColor>(0 rows · {result.durationMs} ms)</Text>;
  }

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
    const headerW = c.length;
    const bodyW = rowSlice.reduce((max, r) => {
      if (r === '…') return max;
      return Math.max(max, fmt(r[c]).length);
    }, 0);
    return Math.min(MAX_CELL_WIDTH, Math.max(headerW, bodyW));
  });

  return (
    <Box flexDirection="column">
      <Box>
        {cols.map((c, i) => (
          <Box key={`h-${i}`} width={widths[i] + 2}>
            <Text bold color="cyan">
              {truncate(c, widths[i]!)}
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
                <Text>{c === '…' ? '…' : truncate(fmt(r[c]), widths[i]!)}</Text>
              </Box>
            ))}
          </Box>
        ),
      )}
      <Text dimColor>
        {result.rowCount} row{result.rowCount === 1 ? '' : 's'} · {result.columns.length} column
        {result.columns.length === 1 ? '' : 's'} · {result.durationMs} ms
        {showAllCols ? '' : ` · showing ${MAX_VISIBLE_COLS} of ${allCols.length} columns`}
        {showAllRows ? '' : ` · showing first ${MAX_VISIBLE_ROWS - 2} + last of ${result.rowCount} rows`}
      </Text>
    </Box>
  );
}
