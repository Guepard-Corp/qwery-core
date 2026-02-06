import { format } from 'sql-formatter';

/**
 * Supported SQL dialects for formatting
 */
export type SqlLanguage =
  | 'sql'
  | 'mysql'
  | 'postgresql'
  | 'sqlite'
  | 'mariadb'
  | 'n1ql'
  | 'db2'
  | 'plsql'
  | 'redshift'
  | 'spark'
  | 'tsql';

/**
 * Options for SQL cleaning and formatting
 */
export interface CleanSqlOptions {
  language?: SqlLanguage;
  format?: boolean;
}

/**
 * Check if the code is running in a browser environment.
 */
export function isBrowser() {
  return typeof window !== 'undefined';
}

/**
 * @name formatCurrency
 * @description Format the currency based on the currency code
 */
export function formatCurrency(params: {
  currencyCode: string;
  locale: string;
  value: string | number;
}) {
  const [lang, region] = params.locale.split('-');

  return new Intl.NumberFormat(region ?? lang, {
    style: 'currency',
    currency: params.currencyCode,
  }).format(Number(params.value));
}

/**
 * @name cleanSql
 * @description Clean and format SQL query by removing escape sequences, quotes, and JSON artifacts,
 * then format it using sql-formatter library
 * @param sql - The SQL query string to clean
 * @param options - Optional formatting options
 * @returns The cleaned and optionally formatted SQL query string
 */
export function cleanSql(
  sql: string | null | undefined,
  options?: CleanSqlOptions,
): string {
  if (!sql || typeof sql !== 'string') {
    return '';
  }

  let cleaned = sql;

  cleaned = cleaned.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

  cleaned = cleaned.replace(/^["']|["']$/g, '');

  cleaned = cleaned.replace(/\}\}$/, '');

  cleaned = cleaned.trim();

  // Format using sql-formatter if enabled (default: true)
  const shouldFormat = options?.format !== false;
  if (shouldFormat && cleaned) {
    try {
      return format(cleaned, {
        language: options?.language || 'sql',
        tabWidth: 2,
        keywordCase: 'upper',
      });
    } catch {
      return cleaned;
    }
  }

  return cleaned;
}

/**
 * Items with optional updatedAt/createdAt for sort-by-modified
 */
export interface WithModifiedDate {
  updatedAt?: Date;
  createdAt?: Date;
}

/**
 * Sort items by modified date (latest first). Use updatedAt if present, else createdAt.
 * Safe for missing dates (treated as epoch).
 */
export function sortByModifiedDesc<T extends WithModifiedDate>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const bTime = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

export function sortByModifiedAsc<T extends WithModifiedDate>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = a.updatedAt?.getTime() ?? a.createdAt?.getTime() ?? 0;
    const bTime = b.updatedAt?.getTime() ?? b.createdAt?.getTime() ?? 0;
    return aTime - bTime;
  });
}

/**
 * Sort items by a custom date getter (latest first).
 */
export function sortByDateDesc<T>(
  items: T[],
  getDate: (item: T) => Date | undefined,
): T[] {
  return [...items].sort((a, b) => {
    const aTime = getDate(a)?.getTime() ?? 0;
    const bTime = getDate(b)?.getTime() ?? 0;
    return bTime - aTime;
  });
}
