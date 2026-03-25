import { useCallback, useMemo, useState } from 'react';
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
import { loadDatasourceBySlug } from '~/lib/loaders/load-datasource-by-slug';
import pathsConfig, { createPath } from '~/config/paths.config';
import { DevProfiler } from '~/lib/perf/dev-profiler';

export const clientLoader = loadDatasourceBySlug;

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

  const columnCountByTableId = useMemo(() => {
    const map = new Map<string, number>();
    for (const col of (metadata?.columns ?? []) as Column[]) {
      map.set(col.table_id, (map.get(col.table_id) ?? 0) + 1);
    }
    return map;
  }, [metadata?.columns]);

  const tableListItems: TableListItem[] = useMemo(() => {
    return filteredTables.map((table) => ({
      tableName: table.name,
      schema: table.schema ?? 'main',
      description: table.comment,
      rowsEstimated: table.live_rows_estimate || 0,
      sizeEstimated: table.size || '0 B',
      numberOfColumns:
        columnCountByTableId.get(table.id) ?? table.columns?.length ?? 0,
    }));
  }, [filteredTables, columnCountByTableId]);

  const basePath = createPath(pathsConfig.app.datasourceTables, slug);

  const handleTableClick = useCallback(
    (table: TableListItem) => {
      const schema = encodeURIComponent(table.schema ?? 'main');
      const tableName = encodeURIComponent(table.tableName);
      navigate(`${basePath}/${schema}/${tableName}`);
    },
    [basePath, navigate],
  );

  if (!datasource) {
    throw new Response('Not Found', { status: 404 });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="bg-muted h-6 w-24 animate-pulse rounded" />
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
      <DevProfiler id="DatasourceTables/Tables">
        <Tables tables={tableListItems} onTableClick={handleTableClick} />
      </DevProfiler>
    </div>
  );
}
