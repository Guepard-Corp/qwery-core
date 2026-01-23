import { loadFromLocalStorage, saveToLocalStorage } from './filter-system';

export type ColumnVisibilityState = Record<string, boolean>;

export function normalizeColumnVisibility(
  defaults: ColumnVisibilityState,
  persisted: ColumnVisibilityState,
): ColumnVisibilityState {
  const next: ColumnVisibilityState = { ...defaults };

  for (const [key, value] of Object.entries(persisted)) {
    if (key in defaults && typeof value === 'boolean') {
      next[key] = value;
    }
  }

  return next;
}

export function loadColumnVisibility(
  storageKey: string,
  defaults: ColumnVisibilityState,
): ColumnVisibilityState {
  const persisted = loadFromLocalStorage<ColumnVisibilityState>(storageKey, {});
  return normalizeColumnVisibility(defaults, persisted);
}

export function saveColumnVisibility(
  storageKey: string,
  state: ColumnVisibilityState,
): void {
  saveToLocalStorage(storageKey, state);
}


