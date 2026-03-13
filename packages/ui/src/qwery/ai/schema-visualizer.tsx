'use client';

import * as React from 'react';
import { Database, Table2, ChevronDown } from 'lucide-react';
import type {
  Column,
  DatasourceMetadata,
  SimpleSchema,
  Table,
} from '@qwery/domain/entities';
import { cn } from '../../lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { TOOL_UI_CONFIG } from './utils/tool-ui-config';
import { Trans } from '../trans';

export interface SchemaVisualizerProps {
  schema: DatasourceMetadata | SimpleSchema[];
  tableName?: string;
  className?: string;
  variant?: 'default' | 'minimal';
}

type DisplayColumn = {
  id: string;
  name: string;
  type: string;
};

type DisplayTable = {
  key: string;
  label: string;
  columns: DisplayColumn[];
};

function matchesTableName(candidate: string, tableName?: string): boolean {
  if (!tableName) {
    return true;
  }

  if (candidate === tableName) {
    return true;
  }

  const lastSegment = candidate.split('.').at(-1);
  return lastSegment === tableName;
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

/**
 * Specialized component for visualizing database schema information
 */
export function SchemaVisualizer({
  schema,
  tableName,
  className,
  variant = 'default',
}: SchemaVisualizerProps) {
  // Group tables by schema-like label (datasource group)
  const groupedTables = React.useMemo(() => {
    const groups: Record<string, DisplayTable[]> = {};

    if (Array.isArray(schema)) {
      for (const simpleSchema of schema) {
        const groupName = `${simpleSchema.databaseName}.${simpleSchema.schemaName}`;
        const filteredTables = simpleSchema.tables.filter((table) =>
          matchesTableName(table.tableName, tableName),
        );

        if (filteredTables.length === 0) {
          continue;
        }

        const displayTables: DisplayTable[] = filteredTables.map((table) => ({
          key: `${groupName}.${table.tableName}`,
          label: table.tableName,
          columns: table.columns.map((column) => ({
            id: `${table.tableName}.${column.columnName}`,
            name: column.columnName,
            type: column.columnType,
          })),
        }));

        const existing = groups[groupName];
        if (existing) {
          existing.push(...displayTables);
        } else {
          groups[groupName] = displayTables;
        }
      }

      return groups;
    }

    const filteredTables = (schema.tables ?? []).filter((table) => {
      const fullName = table.schema
        ? `${table.schema}.${table.name}`
        : table.name;
      return matchesTableName(fullName, tableName);
    });

    for (const table of filteredTables) {
      const resolvedColumns = getColumnsForTable(schema, table)
        .sort((a, b) => a.ordinal_position - b.ordinal_position)
        .map((column) => ({
          id: column.id,
          name: column.name,
          type: column.data_type,
        }));

      const displayTable: DisplayTable = {
        key: `${table.schema || 'main'}.${table.name}`,
        label: table.schema ? `${table.schema}.${table.name}` : table.name,
        columns: resolvedColumns,
      };

      const groupName = table.schema || 'main';
      const existing = groups[groupName];
      if (existing) {
        existing.push(displayTable);
      } else {
        groups[groupName] = [displayTable];
      }
    }

    return groups;
  }, [schema, tableName]);

  const datasourceNames = Object.keys(groupedTables).sort();

  const hasTables = datasourceNames.some(
    (name) => (groupedTables[name]?.length ?? 0) > 0,
  );
  if (!hasTables || datasourceNames.length === 0) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center text-center',
          variant === 'minimal' ? 'p-4' : 'p-8',
          className,
        )}
      >
        <Database
          className={cn(
            'text-muted-foreground opacity-50',
            variant === 'minimal' ? 'mb-2 h-8 w-8' : 'mb-4 h-12 w-12',
          )}
        />
        <h3
          className={cn(
            'text-foreground mb-2 font-semibold',
            variant === 'minimal' ? 'text-xs' : 'text-sm',
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
            variant === 'minimal' ? 'text-[10px]' : 'text-xs',
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
    <div className={cn('space-y-4', className)}>
      {datasourceNames.map((dsName) => (
        <Collapsible
          key={dsName}
          defaultOpen={TOOL_UI_CONFIG.DEFAULT_OPEN}
          className="bg-card rounded-lg border shadow-sm"
        >
          <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center justify-between p-4 transition-colors">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                {/* TODO: Use actual datasource logo from extensions folder if available */}
                <Database className="text-primary h-5 w-5" />
              </div>
              <div className="text-left">
                <h3 className="text-foreground font-semibold">{dsName}</h3>
                <div className="text-muted-foreground text-xs">
                  {groupedTables[dsName]?.length ?? 0} tables found
                </div>
              </div>
            </div>
            <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="space-y-4 border-t p-4">
              {groupedTables[dsName]?.map((table) => (
                <div
                  key={table.key}
                  className="bg-background max-w-full min-w-0 overflow-hidden rounded-md border"
                >
                  <div className="bg-muted/30 flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Table2 className="text-primary/70 h-3.5 w-3.5" />
                      <h4 className="text-foreground/90 font-mono text-sm font-medium">
                        {table.label}
                      </h4>
                    </div>
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[10px]">
                      {table.columns.length} columns
                    </span>
                  </div>

                  {table.columns.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-muted/5 text-muted-foreground border-b text-[10px] tracking-wider uppercase">
                            <th className="w-1/3 px-3 py-1.5 font-medium">
                              Column
                            </th>
                            <th className="px-3 py-1.5 font-medium">Type</th>
                          </tr>
                        </thead>
                        <tbody className="divide-border/50 divide-y">
                          {table.columns.map((col) => (
                            <tr
                              key={col.id}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="text-foreground/90 px-3 py-1.5 text-xs font-medium break-all">
                                {col.name}
                              </td>
                              <td className="text-muted-foreground px-3 py-1.5 font-mono text-[10px]">
                                {col.type}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}
