import { useMemo } from 'react';
import { useParams, Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
  Columns,
  type ColumnListItem,
} from '@qwery/ui/qwery/datasource/columns';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import type { Column, Table } from '@qwery/domain/entities';
import { GetDatasourceBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

import type { Route } from './+types/table';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';

export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug as string;
  if (!slug) return { datasource: null };

  const repositories = await getRepositoriesForLoader();
  const getDatasourceService = new GetDatasourceBySlugService(
    repositories.datasource,
  );

  try {
    const datasource = await getDatasourceService.execute(slug);
    return { datasource };
  } catch (error) {
    if (error instanceof DomainException) return { datasource: null };
    throw error;
  }
}

export default function TablePage(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const tableId = params.id as string;
  const { t } = useTranslation();
  const { datasource } = props.loaderData;

  const { data: metadata, isLoading } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  const table = useMemo(() => {
    if (!metadata?.tables) return null;
    const tables = metadata.tables as Table[];
    return tables.find((t) => t.id.toString() === tableId) || null;
  }, [metadata, tableId]);

  const columns = useMemo(() => {
    if (!metadata?.columns || !table) return [];
    const allColumns = metadata.columns as Column[];
    return allColumns.filter(
      (col) => col.table_id.toString() === tableId && col.table === table.name,
    );
  }, [metadata, table, tableId]);

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
        <p className="text-muted-foreground text-sm">
          {t('datasource.table.loading', {
            defaultValue: 'Loading table...',
          })}
        </p>
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

  const tableName = table.name;
  const tablesPath = `/ds/${slug}/tables`;

  return (
    <div className="space-y-4 p-6">
      <h1 className="text-2xl font-semibold">
        <Link to={tablesPath} className="text-primary hover:underline">
          {t('datasource.table.title', {
            defaultValue: 'Tables',
          })}
        </Link>{' '}
        <span className="text-muted-foreground">&gt;</span> {tableName}
      </h1>
      <Columns columns={columnListItems} />
    </div>
  );
}
