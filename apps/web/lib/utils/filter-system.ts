export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'in';

export type FilterValue = string | string[] | null;

export type FilterRule = {
  field: string;
  operator: FilterOperator;
  value?: FilterValue;
};

export type FilterState = {
  rules: FilterRule[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

function normalizeString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function matchesRule<T extends Record<string, unknown>>(row: T, rule: FilterRule) {
  const raw = row[rule.field];
  const left = normalizeString(raw).toLowerCase();
  const op = rule.operator;

  if (op === 'isEmpty') return left.trim().length === 0;
  if (op === 'isNotEmpty') return left.trim().length > 0;

  const value = rule.value;
  if (value === undefined || value === null) return true;

  if (op === 'in') {
    const list = Array.isArray(value) ? value : [value];
    const normalized = list.map((v) => v.toLowerCase().trim()).filter(Boolean);
    if (normalized.length === 0) return true;
    return normalized.includes(left.trim());
  }

  const right = Array.isArray(value)
    ? value.join(',').toLowerCase()
    : value.toLowerCase();

  if (op === 'equals') return left.trim() === right.trim();
  if (op === 'notEquals') return left.trim() !== right.trim();
  if (op === 'contains') return left.includes(right);
  if (op === 'notContains') return !left.includes(right);
  if (op === 'startsWith') return left.startsWith(right);
  if (op === 'endsWith') return left.endsWith(right);

  return true;
}

export function applyFilterState<T extends Record<string, unknown>>(
  rows: T[],
  state: FilterState,
): T[] {
  const rules = state.rules.filter((r) => r.field && r.operator);
  const filtered =
    rules.length === 0
      ? rows
      : rows.filter((row) => rules.every((rule) => matchesRule(row, rule)));

  if (!state.sortBy) return filtered;

  const sortBy = state.sortBy;
  const sortOrder = state.sortOrder ?? 'asc';
  const dir = sortOrder === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    const av = normalizeString(a[sortBy]).toLowerCase();
    const bv = normalizeString(b[sortBy]).toLowerCase();
    if (av < bv) return -1 * dir;
    if (av > bv) return 1 * dir;
    return 0;
  });
}

export function safeParseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadFromLocalStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  return safeParseJson<T>(window.localStorage.getItem(key), fallback);
}

export function saveToLocalStorage<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}


