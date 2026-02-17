'use client';

import type { DatasourceResultSet } from '@qwery/domain/entities';
import { DataGrid } from '@qwery/ui/qwery/datagrid';
import { cn } from '@qwery/ui/utils';

interface NotebookDataGridProps {
  result: DatasourceResultSet;
  className?: string;
}

export function NotebookDataGrid({ result, className }: NotebookDataGridProps) {
  const { rows, columns, stat } = result;

  return (
    <DataGrid
      className={cn('h-full', className)}
      columns={columns}
      rows={rows}
      stat={stat}
      pageSize={50}
      showRowNumbers
    />
  );
}
