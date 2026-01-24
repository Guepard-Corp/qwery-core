export interface ExportableItem {
  [key: string]: unknown;
}

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
  const keys = options?.headers || allKeys.filter(
    (key) => !options?.excludeKeys?.includes(key),
  );

  const headers = keys.join(',');
  const rows = items.map((item) =>
    keys
      .map((key) => {
        const value = item[key];
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      })
      .join(','),
  );

  const csvContent = [headers, ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

export function exportToJSON<T extends ExportableItem>(
  items: T[],
  filename: string,
  options?: {
    pretty?: boolean;
  },
): void {
  const jsonContent = options?.pretty
    ? JSON.stringify(items, null, 2)
    : JSON.stringify(items);

  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
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

