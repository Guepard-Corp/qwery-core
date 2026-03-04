'use client';

import * as React from 'react';
import {
  Database,
  Table2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  AlertCircleIcon,
} from 'lucide-react';
import type { Column, DatasourceMetadata, Table } from '@qwery/domain/entities';
import { cn } from '../../lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { Button } from '../../shadcn/button';
import { TOOL_UI_CONFIG } from './utils/tool-ui-config';
import { Trans } from '../trans';
import { useCallback, useMemo, useState } from 'react';

const SCHEMA_TABLES_PER_PAGE = 3;

export type SchemaViewMode = 'card' | 'list';

export interface SchemaVisualizerDatasourceItem {
  id: string;
  name?: string;
  slug?: string;
  datasource_provider?: string;
}

export interface SchemaSchemaError {
  datasourceId: string;
  datasourceName?: string;
  error: string;
}

export interface SchemaVisualizerProps {
  schema: DatasourceMetadata;
  tableName?: string;
  className?: string;
  variant?: 'default' | 'minimal';
  datasources?: SchemaVisualizerDatasourceItem[];
  schemaErrors?: SchemaSchemaError[];
  pluginLogoMap?: Map<string, string>;
  onDatasourceNameClick?: (id: string, name: string) => void;
  onTableNameClick?: (
    datasourceId: string,
    datasourceName: string,
    schema: string,
    tableName: string,
  ) => void;
}

function getColumnsForTable(
  metadata: DatasourceMetadata,
  table: Table,
): Column[] {
  if (table.columns?.length) return table.columns;
  return (metadata.columns ?? []).filter(
    (c) =>
      c.table_id === table.id &&
      c.schema === table.schema &&
      c.table === table.name,
  );
}

type TableWithColumns = Table & { resolvedColumns: Column[] };

/** Schema key -> schema name only: "Prod__public" -> "public" */
function schemaNameOnly(schemaKey: string): string {
  const i = schemaKey.indexOf('__');
  if (i > 0) return schemaKey.slice(i + 2);
  return schemaKey;
}

/** Schema key -> datasource prefix: "Prod__public" -> "Prod" */
function datasourcePrefix(schemaKey: string): string {
  const i = schemaKey.indexOf('__');
  if (i > 0) return schemaKey.slice(0, i);
  return schemaKey;
}

function slugifyForPrefix(s: string): string {
  return (
    String(s)
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '') || s
  );
}

/**
 * Specialized component for visualizing database schema information
 */
export function SchemaVisualizer({
  schema,
  tableName,
  className,
  variant = 'default',
  datasources,
  schemaErrors = [],
  pluginLogoMap,
  onDatasourceNameClick,
  onTableNameClick,
}: SchemaVisualizerProps) {
  const isMinimal = variant === 'minimal';
  const groupedTables = useMemo(() => {
    const groups: Record<string, TableWithColumns[]> = {};
    const filteredTables = (schema.tables ?? []).filter((t) => {
      if (!tableName) return true;
      const fullName = t.schema ? `${t.schema}.${t.name}` : t.name;
      return fullName === tableName || t.name === tableName;
    });

    for (const table of filteredTables) {
      const resolvedColumns = getColumnsForTable(schema, table).sort(
        (a, b) => a.ordinal_position - b.ordinal_position,
      );
      const tableWithColumns: TableWithColumns = {
        ...table,
        resolvedColumns,
      };
      const groupName = table.schema || 'main';
      const existing = groups[groupName];
      if (existing) existing.push(tableWithColumns);
      else groups[groupName] = [tableWithColumns];
    }
    return groups;
  }, [schema, tableName]);

  const datasourceNames = Object.keys(groupedTables);

  const [pageBySchema, setPageBySchema] = useState<Record<string, number>>({});
  const [viewModeBySchema, setViewModeBySchema] = useState<
    Record<string, SchemaViewMode>
  >({});

  const hasTables = (schema?.tables?.length ?? 0) > 0;

  const getViewMode = (schemaKey: string) =>
    viewModeBySchema[schemaKey] ?? 'card';

  const getPage = (schemaKey: string) => pageBySchema[schemaKey] ?? 1;
  const setPageForSchema = (schemaKey: string, up: boolean) =>
    setPageBySchema((prev) => {
      const tables = groupedTables[schemaKey] ?? [];
      const total = Math.max(
        1,
        Math.ceil(tables.length / SCHEMA_TABLES_PER_PAGE),
      );
      const current = Math.min(prev[schemaKey] ?? 1, total);
      const next = up ? Math.min(total, current + 1) : Math.max(1, current - 1);
      return { ...prev, [schemaKey]: next };
    });

  const groupsByDatasource = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const schemaKey of datasourceNames) {
      const prefix = datasourcePrefix(schemaKey);
      const list = map[prefix];
      if (list) list.push(schemaKey);
      else map[prefix] = [schemaKey];
    }
    return map;
  }, [datasourceNames]);

  const datasourceOrder = useMemo(() => {
    const order: string[] = [];
    const seen = new Set<string>();
    for (const schemaKey of datasourceNames) {
      const prefix = datasourcePrefix(schemaKey);
      if (!seen.has(prefix)) {
        seen.add(prefix);
        order.push(prefix);
      }
    }
    return order;
  }, [datasourceNames]);

  /** Helper to safely get icon from pluginLogoMap (handles both Map and plain Object) */
  const getPluginIcon = useCallback(
    (provider?: string) => {
      if (!provider || !pluginLogoMap) return undefined;
      try {
        return pluginLogoMap.get(provider);
      } catch {
        return undefined;
      }
    },
    [pluginLogoMap],
  );

  const displayInfoByPrefix = useMemo(() => {
    const map: Record<
      string,
      { id: string; name: string; provider?: string; icon?: string }
    > = {};
    if (!datasources?.length) return map;

    for (const ds of datasources) {
      const name = ds.name || ds.slug || ds.id;
      const icon = getPluginIcon(ds.datasource_provider);
      const info = { id: ds.id, name, provider: ds.datasource_provider, icon };

      // Index by all possible identifier versions to ensure a match
      if (ds.id) map[slugifyForPrefix(ds.id)] = info;
      if (ds.slug) map[slugifyForPrefix(ds.slug)] = info;
      if (ds.name) map[slugifyForPrefix(ds.name)] = info;
    }
    return map;
  }, [datasources, getPluginIcon]);

  if (!schema || !hasTables || datasourceNames.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center',
          isMinimal ? 'p-5' : 'p-10',
          className,
        )}
      >
        <Database
          className={cn(
            'text-muted-foreground opacity-50',
            isMinimal ? 'mb-2 h-9 w-9' : 'mb-4 h-14 w-14',
          )}
        />
        <h3
          className={cn(
            'text-foreground mb-2 font-semibold',
            isMinimal ? 'text-sm' : 'text-base',
          )}
        >
          <Trans
            i18nKey="common:schema.noSchemaDataAvailable"
            defaults="No schema data available"
          />
        </h3>
        <p
          className={cn(
            'text-muted-foreground',
            isMinimal ? 'text-xs' : 'text-sm',
          )}
        >
          <Trans
            i18nKey="common:schema.schemaEmptyOrNotLoaded"
            defaults="The schema information is empty or could not be loaded."
          />
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn('flex flex-col', isMinimal ? 'gap-4' : 'gap-6', className)}
    >
      {schemaErrors.length > 0 && (
        <div className={cn('flex flex-col gap-2', isMinimal ? 'mb-2' : 'mb-4')}>
          <div
            className={cn(
              'flex items-center gap-2 py-1 select-none',
              isMinimal ? 'px-2' : 'px-3',
            )}
          >
            <AlertCircleIcon
              className={cn(
                'text-destructive/80',
                isMinimal ? 'h-4 w-4' : 'h-5 w-5',
              )}
            />
            <span
              className={cn(
                'text-destructive/80 font-bold tracking-widest uppercase',
                isMinimal ? 'text-[10px]' : 'text-xs',
              )}
            >
              Unavailable
            </span>
            <div className="bg-destructive/40 h-px flex-1" />
          </div>
          <div
            className={cn('flex flex-wrap gap-2', isMinimal ? 'px-2' : 'px-3')}
          >
            {schemaErrors.map((e) => {
              const datasource = datasources?.find(
                (ds) => ds.id === e.datasourceId,
              );
              const icon = getPluginIcon(datasource?.datasource_provider);
              const id = datasource?.id ?? e.datasourceId;
              const name =
                datasource?.name ?? e.datasourceName ?? e.datasourceId;
              const provider = datasource?.datasource_provider;
              const label = [
                e.datasourceName ?? e.datasourceId,
                provider ? `(${provider})` : null,
              ]
                .filter(Boolean)
                .join(' ');
              const isClickable = Boolean(onDatasourceNameClick);
              const errorCardClass = cn(
                'bg-destructive/5 text-destructive/80 border-destructive/40 hover:bg-destructive/10 flex items-center gap-2 rounded-md border font-bold shadow-sm transition-all',
                isMinimal ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
              );

              const content = (
                <>
                  {icon ? (
                    <img
                      src={icon}
                      alt={name}
                      className={cn(
                        'shrink-0 object-contain',
                        variant === 'minimal' ? 'h-4 w-4' : 'h-4 w-4',
                        datasource?.datasource_provider === 'json-online' &&
                          'dark:invert',
                      )}
                    />
                  ) : (
                    <Database
                      className={cn(
                        'text-destructive/60 shrink-0',
                        variant === 'minimal' ? 'h-3.5 w-3.5' : 'h-4 w-4',
                      )}
                    />
                  )}
                  {label}
                </>
              );

              return isClickable ? (
                <button
                  key={e.datasourceId}
                  type="button"
                  onClick={() => onDatasourceNameClick?.(id, name)}
                  title={e.error}
                  className={cn(
                    errorCardClass,
                    'cursor-pointer outline-none active:scale-[0.98]',
                  )}
                >
                  {content}
                </button>
              ) : (
                <div
                  key={e.datasourceId}
                  className={errorCardClass}
                  title={e.error}
                >
                  {content}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {datasourceOrder.map((prefix) => {
        const schemaKeys = groupsByDatasource[prefix] ?? [];
        const displayInfo = displayInfoByPrefix[prefix] ?? {
          id: prefix,
          name: prefix,
        };

        return (
          <div
            key={prefix}
            className={cn('flex flex-col', isMinimal ? 'gap-2' : 'gap-3')}
          >
            <div
              className={cn(
                'group flex items-center gap-2 py-1 select-none',
                isMinimal ? 'mt-3 px-2 first:mt-0' : 'mt-5 px-3 first:mt-0',
              )}
              role="separator"
            >
              <button
                type="button"
                onClick={() =>
                  onDatasourceNameClick?.(displayInfo.id, displayInfo.name)
                }
                disabled={!onDatasourceNameClick}
                className={cn(
                  '-ml-1 flex items-center gap-2 rounded-sm px-1 transition-all outline-none',
                  onDatasourceNameClick
                    ? 'hover:bg-muted/50 hover:text-primary cursor-pointer active:scale-[0.98]'
                    : 'cursor-default',
                )}
                title={
                  onDatasourceNameClick
                    ? `View ${displayInfo.name} details`
                    : undefined
                }
              >
                {displayInfo.icon ? (
                  <img
                    src={displayInfo.icon}
                    alt={displayInfo.name}
                    className={cn(
                      'shrink-0 object-contain',
                      isMinimal ? 'h-3.5 w-3.5' : 'h-4 w-4',
                      displayInfo.provider === 'json-online' && 'dark:invert',
                    )}
                  />
                ) : (
                  <Database
                    className={cn(
                      'text-muted-foreground',
                      isMinimal ? 'h-3.5 w-3.5' : 'h-4 w-4',
                    )}
                  />
                )}
                <span
                  className={cn(
                    'text-muted-foreground font-bold tracking-wider whitespace-nowrap uppercase transition-colors',
                    variant === 'minimal' ? 'text-[10px]' : 'text-xs',
                    onDatasourceNameClick && 'group-hover:text-primary',
                  )}
                >
                  {displayInfo.name}
                  {displayInfo.provider ? ` (${displayInfo.provider})` : ''}
                </span>
              </button>
              <div className="bg-border/60 h-px flex-1" />
            </div>

            {schemaKeys.map((dsName) => {
              const allTables = groupedTables[dsName] ?? [];
              const totalPagesForSchema = Math.max(
                1,
                Math.ceil(allTables.length / SCHEMA_TABLES_PER_PAGE),
              );
              const pageForSchema = Math.min(
                getPage(dsName),
                totalPagesForSchema,
              );
              const start = (pageForSchema - 1) * SCHEMA_TABLES_PER_PAGE;
              const tables = allTables.slice(
                start,
                start + SCHEMA_TABLES_PER_PAGE,
              );
              const showPaginationHere =
                allTables.length > SCHEMA_TABLES_PER_PAGE;
              const viewMode = getViewMode(dsName);
              return (
                <Collapsible
                  key={dsName}
                  defaultOpen={TOOL_UI_CONFIG.DEFAULT_OPEN}
                  className={cn(
                    'group/schema overflow-hidden transition-all',
                    isMinimal
                      ? 'border-border/40 bg-muted/5 rounded-lg border'
                      : 'border-border/50 bg-muted/5 rounded-lg border shadow-xs',
                  )}
                >
                  <CollapsibleTrigger
                    className={cn(
                      'flex w-full items-center justify-between gap-2 transition-colors',
                      isMinimal
                        ? 'py-2 pr-2 pl-4'
                        : 'hover:bg-muted/50 px-4 py-3',
                    )}
                  >
                    <span
                      className={cn(
                        'text-foreground min-w-0 truncate font-semibold',
                        isMinimal ? 'text-sm' : 'text-base',
                      )}
                    >
                      {schemaNameOnly(dsName)}
                    </span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span
                        className={cn(
                          'text-foreground tabular-nums',
                          isMinimal ? 'text-[10px]' : 'text-xs',
                        )}
                      >
                        {allTables.length}{' '}
                        {allTables.length === 1 ? 'table' : 'tables'}
                      </span>
                      <ChevronDown
                        className={cn(
                          'text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180',
                          isMinimal ? 'h-3.5 w-3.5' : 'h-4 w-4',
                        )}
                      />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <div
                      className={cn(
                        isMinimal ? 'pt-1.5 pr-1 pb-2.5 pl-4' : 'border-t p-4',
                      )}
                    >
                      {variant !== 'minimal' && (
                        <div className="mb-4 flex justify-end">
                          <div className="flex items-center gap-0.5 rounded-md border p-1">
                            <Button
                              variant={
                                viewMode === 'card' ? 'secondary' : 'ghost'
                              }
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                setViewModeBySchema((s) => ({
                                  ...s,
                                  [dsName]: 'card',
                                }))
                              }
                              aria-label="Card view"
                            >
                              <LayoutGrid className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant={
                                viewMode === 'list' ? 'secondary' : 'ghost'
                              }
                              size="sm"
                              className="h-7 px-2"
                              onClick={() =>
                                setViewModeBySchema((s) => ({
                                  ...s,
                                  [dsName]: 'list',
                                }))
                              }
                              aria-label="List view"
                            >
                              <List className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {viewMode === 'list' || variant === 'minimal' ? (
                        <div
                          className={cn(
                            'overflow-hidden rounded-lg',
                            isMinimal ? 'bg-muted/5' : 'border',
                          )}
                        >
                          <table
                            className={cn(
                              'w-full text-left',
                              isMinimal ? 'text-sm' : 'text-base',
                            )}
                          >
                            {variant !== 'minimal' && (
                              <thead>
                                <tr className="bg-muted/10 text-muted-foreground border-border/30 border-b text-xs tracking-wider uppercase">
                                  <th className="px-4 py-2.5 font-medium">
                                    Table
                                  </th>
                                  <th className="px-4 py-2.5 font-medium">
                                    Columns
                                  </th>
                                </tr>
                              </thead>
                            )}
                            <tbody
                              className={cn(
                                variant === 'minimal'
                                  ? 'divide-border/30 divide-y'
                                  : 'divide-border/50 divide-y',
                              )}
                            >
                              {tables.map((table: TableWithColumns) => {
                                const tableNameContent = (
                                  <div
                                    className="flex items-center gap-1.5"
                                    title={
                                      table.schema
                                        ? `${table.schema}.${table.name}`
                                        : table.name
                                    }
                                  >
                                    {variant === 'minimal' && (
                                      <Table2 className="text-muted-foreground/40 h-3.5 w-3.5 shrink-0" />
                                    )}
                                    {table.name}
                                  </div>
                                );
                                const openTable = onTableNameClick
                                  ? () =>
                                      onTableNameClick(
                                        displayInfo.id,
                                        displayInfo.name,
                                        schemaNameOnly(table.schema ?? ''),
                                        table.name,
                                      )
                                  : null;
                                const openDatasource = onDatasourceNameClick
                                  ? () =>
                                      onDatasourceNameClick(
                                        displayInfo.id,
                                        displayInfo.name,
                                      )
                                  : null;
                                const isTableClickable = Boolean(
                                  openTable ?? openDatasource,
                                );
                                const handleClick = openTable ?? openDatasource;
                                return (
                                  <tr
                                    key={`${table.schema}.${table.name}`}
                                    className="hover:bg-muted/20 transition-colors"
                                  >
                                    <td
                                      className={cn(
                                        'font-mono',
                                        isMinimal
                                          ? 'px-3 py-2 text-xs'
                                          : 'px-4 py-2.5 text-sm',
                                        isTableClickable && 'p-0',
                                      )}
                                    >
                                      {isTableClickable && handleClick ? (
                                        <button
                                          type="button"
                                          onClick={handleClick}
                                          className="text-foreground/90 hover:text-primary w-full cursor-pointer rounded-sm px-3 py-2 text-left transition-colors outline-none hover:underline"
                                          title={
                                            openTable
                                              ? `Open table ${table.name} in new tab`
                                              : `Open ${displayInfo.name} in new tab`
                                          }
                                        >
                                          {tableNameContent}
                                        </button>
                                      ) : (
                                        <div className="text-foreground/90">
                                          {tableNameContent}
                                        </div>
                                      )}
                                    </td>
                                    <td
                                      className={cn(
                                        'text-muted-foreground font-mono tabular-nums',
                                        isMinimal
                                          ? 'pr-3 text-right text-[10px]'
                                          : 'px-4 py-2.5 text-sm',
                                      )}
                                    >
                                      {table.resolvedColumns.length}
                                      {variant !== 'minimal' && ' columns'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div
                          className={cn(isMinimal ? 'space-y-4' : 'space-y-5')}
                        >
                          {tables.map((table: TableWithColumns) => {
                            const openTableCard = onTableNameClick
                              ? () =>
                                  onTableNameClick(
                                    displayInfo.id,
                                    displayInfo.name,
                                    schemaNameOnly(table.schema ?? ''),
                                    table.name,
                                  )
                              : null;
                            const openDatasourceCard = onDatasourceNameClick
                              ? () =>
                                  onDatasourceNameClick(
                                    displayInfo.id,
                                    displayInfo.name,
                                  )
                              : null;
                            const handleCardTitleClick =
                              openTableCard ?? openDatasourceCard;
                            return (
                              <div
                                key={`${table.schema}.${table.name}`}
                                className="bg-background max-w-full min-w-0 overflow-hidden rounded-md border"
                              >
                                <div
                                  className={cn(
                                    'bg-muted/10 border-border/30 flex items-center justify-between border-b',
                                    isMinimal ? 'px-3 py-2' : 'px-4 py-2.5',
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Table2
                                      className={cn(
                                        'text-primary/70',
                                        isMinimal ? 'h-3.5 w-3.5' : 'h-4 w-4',
                                      )}
                                    />
                                    {handleCardTitleClick ? (
                                      <button
                                        type="button"
                                        onClick={handleCardTitleClick}
                                        className={cn(
                                          'text-foreground/90 hover:text-primary cursor-pointer text-left font-mono font-medium transition-colors outline-none hover:underline',
                                          isMinimal ? 'text-sm' : 'text-base',
                                        )}
                                        title={
                                          openTableCard
                                            ? `Open table ${table.name} in new tab`
                                            : `Open ${displayInfo.name} in new tab`
                                        }
                                      >
                                        {table.name}
                                      </button>
                                    ) : (
                                      <h4
                                        className={cn(
                                          'text-foreground/90 font-mono font-medium',
                                          isMinimal ? 'text-sm' : 'text-base',
                                        )}
                                        title={
                                          table.schema
                                            ? `${table.schema}.${table.name}`
                                            : table.name
                                        }
                                      >
                                        {table.name}
                                      </h4>
                                    )}
                                  </div>
                                  <span
                                    className={cn(
                                      'bg-muted/50 text-muted-foreground rounded-full font-mono',
                                      isMinimal
                                        ? 'px-2 py-0.5 text-[10px]'
                                        : 'px-2.5 py-1 text-xs',
                                    )}
                                  >
                                    {table.resolvedColumns.length} columns
                                  </span>
                                </div>

                                {table.resolvedColumns.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table
                                      className={cn(
                                        'w-full text-left',
                                        isMinimal ? 'text-sm' : 'text-base',
                                      )}
                                    >
                                      <thead>
                                        <tr className="bg-muted/10 text-muted-foreground border-border/30 border-b text-xs tracking-wider uppercase">
                                          <th
                                            className={cn(
                                              'w-1/3 font-medium',
                                              isMinimal
                                                ? 'px-3 py-1.5'
                                                : 'px-4 py-2',
                                            )}
                                          >
                                            Column
                                          </th>
                                          <th
                                            className={cn(
                                              'font-medium',
                                              isMinimal
                                                ? 'px-3 py-1.5'
                                                : 'px-4 py-2',
                                            )}
                                          >
                                            Type
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-border/30 divide-y">
                                        {table.resolvedColumns.map(
                                          (col: Column) => (
                                            <tr
                                              key={col.id}
                                              className="hover:bg-muted/20 transition-colors"
                                            >
                                              <td
                                                className={cn(
                                                  'text-foreground/90 font-medium break-all',
                                                  isMinimal
                                                    ? 'px-3 py-1.5 text-xs'
                                                    : 'px-4 py-2 text-sm',
                                                )}
                                              >
                                                {col.name}
                                              </td>
                                              <td
                                                className={cn(
                                                  'text-muted-foreground font-mono',
                                                  isMinimal
                                                    ? 'px-3 py-1.5 text-[10px]'
                                                    : 'px-4 py-2 text-xs',
                                                )}
                                              >
                                                {col.data_type}
                                              </td>
                                            </tr>
                                          ),
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {showPaginationHere && (
                        <div
                          className={cn(
                            'bg-muted/5 border-border/40 group/pagination hover:bg-muted/10 flex items-center justify-between gap-2 overflow-hidden rounded-lg border px-2 py-1.5 shadow-xs transition-all hover:shadow-md',
                            isMinimal ? 'mt-4 h-9' : 'mt-6 h-10',
                          )}
                        >
                          <div
                            className={cn(
                              'text-foreground ml-2 font-medium tracking-wider uppercase select-none',
                              isMinimal ? 'text-[10px]' : 'text-xs',
                            )}
                          >
                            <span className="text-foreground font-semibold tabular-nums">
                              {start + 1}
                            </span>
                            <span className="mx-0.5">–</span>
                            <span className="text-foreground font-semibold tabular-nums">
                              {Math.min(
                                start + SCHEMA_TABLES_PER_PAGE,
                                allTables.length,
                              )}
                            </span>
                            <span className="mx-1 lowercase">of</span>
                            <span className="text-foreground font-semibold tabular-nums">
                              {allTables.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'hover:bg-background/80 hover:text-primary transition-all',
                                isMinimal ? 'h-7 w-7' : 'h-8 w-8',
                              )}
                              onClick={() => {
                                if (pageForSchema > 1)
                                  setPageForSchema(dsName, false);
                              }}
                              disabled={pageForSchema <= 1}
                              title="Previous page"
                            >
                              <ChevronLeft
                                className={cn(
                                  variant === 'minimal'
                                    ? 'h-3.5 w-3.5'
                                    : 'h-4 w-4',
                                )}
                              />
                            </Button>
                            <div
                              className={cn(
                                'text-foreground min-w-[2.5rem] text-center font-bold tabular-nums select-none',
                                isMinimal ? 'text-[10px]' : 'text-xs',
                              )}
                            >
                              {pageForSchema}
                              <span className="text-foreground mx-1 font-normal">
                                /
                              </span>
                              {totalPagesForSchema}
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={cn(
                                'hover:bg-background/80 hover:text-primary transition-all',
                                isMinimal ? 'h-7 w-7' : 'h-8 w-8',
                              )}
                              onClick={() => {
                                if (pageForSchema < totalPagesForSchema)
                                  setPageForSchema(dsName, true);
                              }}
                              disabled={pageForSchema >= totalPagesForSchema}
                              title="Next page"
                            >
                              <ChevronRight
                                className={cn(
                                  variant === 'minimal'
                                    ? 'h-3.5 w-3.5'
                                    : 'h-4 w-4',
                                )}
                              />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
