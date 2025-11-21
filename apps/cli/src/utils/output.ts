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
    console.table(data.map((row) => serializeRow(row)));
    return;
  }

  console.table([serializeRow(data)]);
}

