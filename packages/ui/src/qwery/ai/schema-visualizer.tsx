'use client';

import * as React from 'react';
import { Database, Table2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { TOOL_UI_CONFIG } from './tool-ui-config';
import { Trans } from '../trans';

export interface SchemaColumn {
  columnName: string;
  columnType: string;
}

export interface SchemaTable {
  tableName: string;
  columns: SchemaColumn[];
}

export interface SchemaData {
  databaseName: string;
  schemaName: string;
  tables: SchemaTable[];
}

export interface SchemaVisualizerProps {
  schema: SchemaData;
  tableName?: string;
  className?: string;
  variant?: 'default' | 'minimal';
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
  // Group tables by datasource
  const groupedTables = React.useMemo(() => {
    const groups: Record<string, SchemaTable[]> = {};

    // Filter tables if tableName is provided
    const filteredTables = tableName
      ? schema.tables.filter((t) => t.tableName === tableName)
      : schema.tables;

    filteredTables.forEach((table) => {
      let datasourceName = schema.databaseName || 'Main';

      // Parse datasource from table name (format: datasource.schema.table)
      if (table.tableName.includes('.')) {
        const parts = table.tableName.split('.');
        if (parts.length >= 2) {
          // Usually [datasource, schema, table] or [datasource, table]
          // We'll treat the first part as datasource if it looks like a path
          datasourceName = parts[0]!;
        }
      } else if (schema.databaseName === 'main' || !schema.databaseName) {
        datasourceName = 'Main Database';
      }

      const existingGroup = groups[datasourceName];
      if (existingGroup) {
        existingGroup.push(table);
      } else {
        groups[datasourceName] = [table];
      }
    });

    return groups;
  }, [schema, tableName]);

  const datasourceNames = Object.keys(groupedTables);

  // Handle empty state: no tables, empty tables array, or no schema data
  if (
    !schema ||
    !schema.tables ||
    schema.tables.length === 0 ||
    datasourceNames.length === 0
  ) {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center text-center',
        variant === 'minimal' ? 'p-4' : 'p-8',
        className
      )}>
        <Database className={cn(
          "text-muted-foreground opacity-50",
          variant === 'minimal' ? "h-8 w-8 mb-2" : "h-12 w-12 mb-4"
        )} />
        <h3 className={cn(
          "text-foreground mb-2 font-semibold",
          variant === 'minimal' ? "text-xs" : "text-sm"
        )}>
          <Trans i18nKey="common:schema.noSchemaDataAvailable" defaults="No schema data available" />
        </h3>
        <p className={cn(
          "text-muted-foreground",
          variant === 'minimal' ? "text-[10px]" : "text-xs"
        )}>
          <Trans i18nKey="common:schema.schemaEmptyOrNotLoaded" defaults="The schema information is empty or could not be loaded." />
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
                  key={table.tableName}
                  className="bg-background max-w-full min-w-0 overflow-hidden rounded-md border"
                >
                  {/* Table Header */}
                  <div className="bg-muted/30 flex items-center justify-between border-b px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Table2 className="text-primary/70 h-3.5 w-3.5" />
                      <h4 className="text-foreground/90 font-mono text-sm font-medium">
                        {/* Display clean table name without datasource prefix for clarity inside group */}
                        {table.tableName.includes('.')
                          ? table.tableName.split('.').slice(1).join('.')
                          : table.tableName}
                      </h4>
                    </div>
                    <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[10px]">
                      {table.columns.length} columns
                    </span>
                  </div>

                  {/* Columns Table */}
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
                              key={col.columnName}
                              className="hover:bg-muted/20 transition-colors"
                            >
                              <td className="text-foreground/90 px-3 py-1.5 text-xs font-medium break-all">
                                {col.columnName}
                              </td>
                              <td className="text-muted-foreground px-3 py-1.5 font-mono text-[10px]">
                                {col.columnType}
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
