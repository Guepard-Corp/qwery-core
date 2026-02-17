import * as React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { ColumnHeader, DatasourceRow } from '@qwery/domain/entities';
import { DataGrid } from './datagrid';

const meta: Meta<typeof DataGrid> = {
  title: 'Qwery/DataGrid',
  component: DataGrid,
};

export default meta;
type Story = StoryObj<typeof DataGrid>;

const columns: ColumnHeader[] = [
  { name: 'id', displayName: 'ID', originalType: 'INTEGER', type: 'integer' },
  {
    name: 'string_col',
    displayName: 'String',
    originalType: 'VARCHAR',
    type: 'string',
  },
  {
    name: 'number_col',
    displayName: 'Number',
    originalType: 'INTEGER',
    type: 'integer',
  },
  {
    name: 'decimal_col',
    displayName: 'Decimal',
    originalType: 'DECIMAL',
    type: 'decimal',
  },
  {
    name: 'boolean_col',
    displayName: 'Boolean',
    originalType: 'BOOLEAN',
    type: 'boolean',
  },
  {
    name: 'date_col',
    displayName: 'Date',
    originalType: 'DATE',
    type: 'date',
  },
  {
    name: 'timestamp_col',
    displayName: 'Timestamp',
    originalType: 'TIMESTAMP',
    type: 'timestamp',
  },
  {
    name: 'null_col',
    displayName: 'Null',
    originalType: 'VARCHAR',
    type: 'string',
  },
  {
    name: 'json_col',
    displayName: 'JSON',
    originalType: 'JSON',
    type: 'json',
  },
];

const rows: DatasourceRow[] = Array.from({ length: 85 }, (_, i) => ({
  id: i + 1,
  string_col:
    i % 5 === 0
      ? 'This is a much longer text that will be truncated at 32 characters with an ellipsis'
      : `Item ${i + 1}`,
  number_col: (i + 1) * 100,
  decimal_col: Math.round((Math.random() * 100 + 0.5) * 100) / 100,
  boolean_col: i % 2 === 0,
  date_col: new Date(2024, 0, 1 + (i % 30)).toISOString().split('T')[0],
  timestamp_col: new Date(2024, 0, 1 + (i % 30), 10, 30).toISOString(),
  null_col: i % 7 === 0 ? null : `value ${i}`,
  json_col:
    i % 3 === 0
      ? { key: 'value', nested: { data: [1, 2, 3] } }
      : { id: i, status: i % 2 === 0 ? 'active' : 'inactive' },
}));

export const Default: Story = {
  render: () => (
    <div className="h-[700px]">
      <DataGrid
        columns={columns}
        rows={rows}
        title="Query Results"
        showRowNumbers
        pageSize={15}
        stat={{ rowsRead: 85, queryDurationMs: 142 }}
        onDownloadCSV={() => alert('Download CSV')}
      />
      <p className="text-muted-foreground mt-2 text-xs">
        Stats, pagination, actions menu (Export CSV, Copy page). Text truncates
        at 32 chars. Double-click a row to open the sheet sidebar with full
        data.
      </p>
    </div>
  ),
};
