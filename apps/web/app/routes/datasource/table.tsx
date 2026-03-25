import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Columns,
  type ColumnListItem,
} from '@qwery/ui/qwery/datasource/columns';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import type { Column, Table } from '@qwery/domain/entities';

import type { Route } from './+types/table';
import { loadDatasourceBySlug } from '~/lib/loaders/load-datasource-by-slug';
import pathsConfig, { createPath } from '~/config/paths.config';

export const clientLoader = loadDatasourceBySlug;

export default function TablePage(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const schemaParam = params.schema as string;
  const tableNameParam = params.tableName as string;
  const schema = schemaParam ? decodeURIComponent(schemaParam) : '';
  const tableName = tableNameParam ? decodeURIComponent(tableNameParam) : '';
  const { t } = useTranslation();
  const { datasource } = props.loaderData;

  const { data: metadata, isLoading } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  const table = useMemo(() => {
    if (!metadata?.tables || !schema || !tableName) return null;
    const tables = metadata.tables as Table[];
    return (
      tables.find(
        (t) => (t.schema ?? 'main') === schema && t.name === tableName,
      ) ?? null
    );
  }, [metadata, schema, tableName]);

  const columns = useMemo(() => {
    if (!metadata?.columns || !table) return [];
    const allColumns = metadata.columns as Column[];
    return allColumns.filter(
      (col) =>
        col.table_id === table.id &&
        col.table === table.name &&
        (col.schema ?? 'main') === (table.schema ?? 'main'),
    );
  }, [metadata, table]);

  const columnListItems: ColumnListItem[] = useMemo(() => {
    return columns.map((col) => ({
      name: col.name,
      description: col.comment,
      dataType: col.data_type,
      format: col.format,
    }));
  }, [columns]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-muted h-6 w-24 animate-pulse rounded" />
      </div>
    );
  }

  if (!metadata || !table) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {t('datasource.table.error', {
            defaultValue: 'Table not found',
          })}
        </p>
      </div>
    );
  }

  const tablesPath = createPath(pathsConfig.app.datasourceTables, slug);

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">
        <Link to={tablesPath} className="text-primary hover:underline">
          {t('datasource.table.title', {
            defaultValue: 'Tables',
          })}
        </Link>{' '}
        <span className="text-muted-foreground">&gt;</span> {table.name}
      </h1>
      <Columns columns={columnListItems} />
    </div>
  );
}
