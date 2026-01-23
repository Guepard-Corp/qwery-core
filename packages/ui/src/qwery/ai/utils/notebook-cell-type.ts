export type NotebookCellType = 'query' | 'prompt';

export function isNotebookCellType(value: unknown): value is NotebookCellType {
  return value === 'query' || value === 'prompt';
}

export function assertNotebookCellType(
  value: unknown,
): asserts value is NotebookCellType {
  if (!isNotebookCellType(value)) {
    throw new Error(
      `Invalid notebook cell type: ${value}. Expected 'query' or 'prompt'`,
    );
  }
}

export function getNotebookCellTypeLabel(cellType: NotebookCellType): string {
  return cellType === 'query' ? 'Query' : 'Prompt';
}

export interface NotebookCellTypeConfig {
  label: string;
  description: string;
  icon?: string;
}

export function getNotebookCellTypeConfig(
  cellType: NotebookCellType,
): NotebookCellTypeConfig {
  if (cellType === 'query') {
    return {
      label: 'Query',
      description: 'SQL query cell',
      icon: 'database',
    };
  }

  return {
    label: 'Prompt',
    description: 'Prompt cell',
    icon: 'message-square',
  };
}
