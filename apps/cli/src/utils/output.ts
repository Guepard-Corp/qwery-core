export type OutputFormat = 'table' | 'json';

export function resolveFormat(value?: string): OutputFormat {
  if (!value) {
    return 'table';
  }

  const normalized = value.trim().toLowerCase();
  return normalized === 'json' ? 'json' : 'table';
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
    console.table(data);
    return;
  }

  console.table([data]);
}

