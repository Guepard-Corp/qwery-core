import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Tables, type TableListItem } from '@qwery/ui/qwery/datasource/tables';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@qwery/ui/select';
import { useGetDatasourceMetadata } from '~/lib/queries/use-get-datasource-metadata';
import type { Table, Column } from '@qwery/domain/entities';

import type { Route } from './+types/tables';
import { getRepositoriesForLoader } from '~/lib/loaders/create-repositories';
import { GetDatasourceBySlugService } from '@qwery/domain/services';
import { DomainException } from '@qwery/domain/exceptions';

export async function loader({ params }: Route.LoaderArgs) {
  const slug = params.slug as string;
  if (!slug) {
    return { datasource: null };
  }

  const repositories = await getRepositoriesForLoader();
  const getDatasourceService = new GetDatasourceBySlugService(
    repositories.datasource,
  );

  try {
    const datasource = await getDatasourceService.execute(slug);
    return { datasource };
  } catch (error) {
    if (error instanceof DomainException) {
      return { datasource: null };
    }
    throw error;
  }
}

export default function TablesPage(props: Route.ComponentProps) {
  const params = useParams();
  const slug = params.slug as string;
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { datasource } = props.loaderData;
  const [selectedSchema, setSelectedSchema] = useState<string>('all');

  const { data: metadata, isLoading } = useGetDatasourceMetadata(datasource, {
    enabled: !!datasource,
  });

  const schemas = useMemo(() => {
    if (!metadata?.schemas) return [];
    return Array.from(new Set(metadata.schemas.map((s) => s.name))).sort();
  }, [metadata]);

  const filteredTables = useMemo(() => {
    if (!metadata?.tables) return [];
    const tables = metadata.tables as Table[];
    if (selectedSchema === 'all') return tables;
    return tables.filter((table) => table.schema === selectedSchema);
  }, [metadata, selectedSchema]);

  const tableListItems: TableListItem[] = useMemo(() => {
    const allColumns = (metadata?.columns || []) as Column[];
    return filteredTables.map((table) => {
      const columnCount = allColumns.filter(
        (col) => col.table_id === table.id && col.table === table.name,
      ).length;
      return {
        tableName: table.name,
        description: table.comment,
        rowsEstimated: table.live_rows_estimate || 0,
        sizeEstimated: table.size || '0 B',
        numberOfColumns: columnCount || table.columns?.length || 0,
      };
    });
  }, [filteredTables, metadata]);

  const handleTableClick = (table: TableListItem) => {
    const tableData = filteredTables.find((t) => t.name === table.tableName);
    if (!tableData) return;

    const tablePath = `/ds/${slug}/tables/${tableData.id}`;
    navigate(tablePath);
  };

  if (!datasource) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {t('datasource.tables.error', {
            defaultValue: 'Datasource not found',
          })}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {t('datasource.tables.loading', {
            defaultValue: 'Loading tables...',
          })}
        </p>
      </div>
    );
  }

  if (!metadata) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">
          {t('datasource.tables.error', {
            defaultValue: 'Failed to load tables',
          })}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {t('datasource.tables.title', { defaultValue: 'Tables' })}
        </h1>
        {schemas.length > 0 && (
          <Select value={selectedSchema} onValueChange={setSelectedSchema}>
            <SelectTrigger className="w-[200px]">
              <SelectValue
                placeholder={t('datasource.tables.filter.schema', {
                  defaultValue: 'Filter by schema',
                })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {t('datasource.tables.filter.all', {
                  defaultValue: 'All schemas',
                })}
              </SelectItem>
              {schemas.map((schema) => (
                <SelectItem key={schema} value={schema}>
                  {schema}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      <Tables tables={tableListItems} onTableClick={handleTableClick} />
    </div>
  );
}
