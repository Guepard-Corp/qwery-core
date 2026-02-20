import Papa from 'papaparse';

export interface ExportableItem {
  [key: string]: unknown;
}

/**
 * Serialize a value to a string, handling Date objects and other complex types
 */
function serializeValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

/**
 * Convert an array of objects to CSV format using Papa Parse
 */
export function exportToCSV<T extends ExportableItem>(
  items: T[],
  filename: string,
  options?: {
    headers?: string[];
    excludeKeys?: string[];
  },
): void {
  if (items.length === 0) {
    return;
  }

  const firstItem = items[0];
  if (!firstItem) {
    return;
  }

  const allKeys = Object.keys(firstItem);
  const keys =
    options?.headers ||
    allKeys.filter((key) => !options?.excludeKeys?.includes(key));

  // Serialize values properly (handle Date objects, etc.)
  const serializedItems = items.map((item) => {
    const serialized: Record<string, string> = {};
    keys.forEach((key) => {
      serialized[key] = serializeValue(item[key]);
    });
    return serialized;
  });

  const csv = Papa.unparse(serializedItems, {
    columns: keys,
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export data as JSON
 */
export function exportToJSON<T extends ExportableItem>(
  items: T[],
  filename: string,
  options?: {
    pretty?: boolean;
  },
): void {
  // Serialize Date objects to ISO strings for JSON
  const serializedItems = items.map((item) => {
    const serialized: Record<string, unknown> = {};
    Object.keys(item).forEach((key) => {
      const value = item[key];
      if (value instanceof Date) {
        serialized[key] = value.toISOString();
      } else {
        serialized[key] = value;
      }
    });
    return serialized;
  });

  const jsonContent = options?.pretty
    ? JSON.stringify(serializedItems, null, 2)
    : JSON.stringify(serializedItems);

  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export table data (columns + rows) to CSV
 */
export interface TableData {
  columns: string[];
  rows: Array<Record<string, unknown>>;
}

export function exportTableToCSV(
  data: TableData,
  filename: string = 'query-results',
): void {
  if (!data || !data.columns || !data.rows || data.rows.length === 0) {
    return;
  }

  // Serialize values properly (handle Date objects, etc.)
  const serializedRows = data.rows.map((row) => {
    const serialized: Record<string, string> = {};
    data.columns.forEach((col) => {
      serialized[col] = serializeValue(row[col]);
    });
    return serialized;
  });

  const csv = Papa.unparse(serializedRows, {
    columns: data.columns,
    header: true,
  });

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export table data (columns + rows) to JSON
 */
export function exportTableToJSON(
  data: TableData,
  filename: string = 'query-results',
  pretty: boolean = true,
): void {
  if (!data || !data.columns || !data.rows) {
    return;
  }

  // Serialize Date objects to ISO strings for JSON
  const serializedRows = data.rows.map((row) => {
    const serialized: Record<string, unknown> = {};
    data.columns.forEach((col) => {
      const value = row[col];
      if (value instanceof Date) {
        serialized[col] = value.toISOString();
      } else {
        serialized[col] = value;
      }
    });
    return serialized;
  });

  const jsonContent = pretty
    ? JSON.stringify(serializedRows, null, 2)
    : JSON.stringify(serializedRows);

  const blob = new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;',
  });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convert table data to CSV string (for copying to clipboard)
 */
export function tableToCSVString(data: TableData): string {
  if (!data || !data.columns || !data.rows || data.rows.length === 0) {
    return '';
  }

  // Serialize values properly (handle Date objects, etc.)
  const serializedRows = data.rows.map((row) => {
    const serialized: Record<string, string> = {};
    data.columns.forEach((col) => {
      serialized[col] = serializeValue(row[col]);
    });
    return serialized;
  });

  return Papa.unparse(serializedRows, {
    columns: data.columns,
    header: true,
  });
}
