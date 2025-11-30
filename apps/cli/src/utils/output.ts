import { formatTable, colors, infoBox, successBox } from './formatting';

export type OutputFormat = 'table' | 'json';

export function resolveFormat(value?: string): OutputFormat {
  if (!value) {
    return 'table';
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'json' ? 'json' : 'table';
}

function serializeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value) || typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  return value;
}

function serializeRow(row: unknown): unknown {
  if (row && typeof row === 'object' && !Array.isArray(row)) {
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, serializeValue(value)]),
    );
  }

  return serializeValue(row);
}

export function printOutput<TFormat extends OutputFormat>(
  data: unknown,
  format: TFormat,
  emptyMessage = 'No records found.',
): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data) && data.length === 0) {
    console.log(emptyMessage);
    return;
  }

  if (Array.isArray(data)) {
    const serialized = data.map((row) => serializeRow(row)) as Array<
      Record<string, unknown>
    >;
    const table = formatTable(serialized, { color: colors.brand });
    console.log('\n' + table + '\n');
    return;
  }

  const serialized = serializeRow(data) as Record<string, unknown>;
  const table = formatTable([serialized], { color: colors.brand });
  console.log('\n' + table + '\n');
}

export function printInteractiveResult(result: {
  sql: string;
  rows: Array<Record<string, unknown>>;
  rowCount: number;
}): void {
  if (result.rows.length === 0) {
    console.log(
      '\n' + infoBox('Query executed successfully.\n\n(0 rows)') + '\n',
    );
    return;
  }

  // Show results in perfectly aligned table
  const serializedRows = result.rows.map((row) => serializeRow(row)) as Array<
    Record<string, unknown>
  >;
  const table = formatTable(serializedRows, { color: colors.brand });
  console.log('\n' + table + '\n');

  // Show summary with formatting
  const summary = `Query executed successfully.\n\n${result.rowCount} row${result.rowCount !== 1 ? 's' : ''} returned`;
  console.log(successBox(summary));
}
