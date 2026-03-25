import { memo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../shadcn/table';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

export interface TableListItem {
  tableName: string;
  schema: string;
  description: string | null;
  rowsEstimated: number;
  sizeEstimated: string;
  numberOfColumns: number;
}

export interface TablesProps {
  tables: TableListItem[];
  onTableClick?: (table: TableListItem) => void;
  className?: string;
}

const VIRTUALIZE_THRESHOLD = 50;
const ROW_HEIGHT = 48;
const MAX_HEIGHT = 600;

export const Tables = memo(function Tables({
  tables,
  onTableClick,
  className,
}: TablesProps) {
  const { t } = useTranslation();

  const formatNumber = (num: number) => {
    if (num >= 1_000_000_000) {
      return `${(num / 1_000_000_000).toFixed(1)}B`;
    }
    if (num >= 1_000_000) {
      return `${(num / 1_000_000).toFixed(1)}M`;
    }
    if (num >= 1_000) {
      return `${(num / 1_000).toFixed(1)}K`;
    }
    return num.toString();
  };

  const rowsText = (count: number) => {
    const template = t('datasource.tables.rows', {
      defaultValue: '{{count}} rows',
    });
    const formattedCount = formatNumber(count);
    const result = template.replace(/\{\{count\}\}/g, formattedCount);
    return result === template ? `${formattedCount} ${template}` : result;
  };

  const columnsText = (count: number) => {
    const template = t('datasource.tables.columns', {
      defaultValue: '{{count}} columns',
    });
    const result = template.replace(/\{\{count\}\}/g, count.toString());
    return result === template ? `${count} ${template}` : result;
  };

  if (tables.length === 0) {
    return (
      <div className={cn('py-12 text-center', className)}>
        <p className="text-muted-foreground text-sm">
          {t('datasource.tables.list.empty', {
            defaultValue: 'No tables found',
          })}
        </p>
      </div>
    );
  }

  const tableHeader = () => (
    <TableHeader>
      <TableRow>
        <TableHead>
          {t('datasource.tables.header.name', {
            defaultValue: 'Table name',
          })}
        </TableHead>
        <TableHead>
          {t('datasource.tables.header.description', {
            defaultValue: 'Description',
          })}
        </TableHead>
        <TableHead className="text-right">
          {t('datasource.tables.header.rows', {
            defaultValue: 'Rows (Estimated)',
          })}
        </TableHead>
        <TableHead className="text-right">
          {t('datasource.tables.header.size', {
            defaultValue: 'Size (Estimated)',
          })}
        </TableHead>
        <TableHead className="text-right">
          {t('datasource.tables.header.columns', {
            defaultValue: 'Number of columns',
          })}
        </TableHead>
      </TableRow>
    </TableHeader>
  );

  const renderRow = (_index: number, table: TableListItem) => (
    <TableRow
      key={`${table.schema}-${table.tableName}`}
      className={onTableClick ? 'cursor-pointer' : undefined}
      onClick={() => onTableClick?.(table)}
      data-test={`table-row-${table.schema}-${table.tableName}`}
      style={{ height: ROW_HEIGHT }}
    >
      <TableCell className="font-medium">{table.tableName}</TableCell>
      <TableCell className="text-muted-foreground">
        {table.description || (
          <span className="text-muted-foreground/50">
            {t('datasource.tables.noDescription', {
              defaultValue: '—',
            })}
          </span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {rowsText(table.rowsEstimated)}
      </TableCell>
      <TableCell className="text-right">
        {t('datasource.tables.size', {
          defaultValue: '{{size}}',
        }).replace('{{size}}', table.sizeEstimated)}
      </TableCell>
      <TableCell className="text-right">
        {columnsText(table.numberOfColumns)}
      </TableCell>
    </TableRow>
  );

  const listHeight = Math.min(tables.length * ROW_HEIGHT + 40, MAX_HEIGHT);

  if (tables.length > VIRTUALIZE_THRESHOLD) {
    return (
      <div className={cn('rounded-md border', className)}>
        <TableVirtuoso
          style={{ height: listHeight }}
          data={tables}
          fixedHeaderContent={tableHeader}
          itemContent={renderRow}
          components={{
            Table: ({ style, ...props }) => (
              <table
                {...props}
                style={style}
                className="w-full caption-bottom text-sm"
              />
            ),
            TableBody: TableBody as React.ComponentType,
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn('rounded-md border', className)}>
      <div style={{ height: listHeight, overflowY: 'auto' }}>
        <table className="w-full caption-bottom text-sm">
          {tableHeader()}
          <TableBody>
            {tables.map((table, index) => renderRow(index, table))}
          </TableBody>
        </table>
      </div>
    </div>
  );
});
