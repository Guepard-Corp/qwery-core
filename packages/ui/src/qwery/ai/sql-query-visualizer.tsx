'use client';

import * as React from 'react';
import { Database, Table2, FileText, BarChart3 } from 'lucide-react';
import { CodeBlock, CodeBlockCopyButton } from '../../ai-elements/code-block';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import { DataGrid } from './data-grid';

export interface SQLQueryResult {
  result: {
    columns: string[];
    rows: Array<Record<string, unknown>>;
  };
}

export interface SQLQueryVisualizerProps {
  query?: string;
  result?: SQLQueryResult;
  className?: string;
  onPasteToNotebook?: () => void;
  showPasteButton?: boolean;
  chartExecutionOverride?: boolean;
}

/**
 * Specialized component for visualizing SQL queries and their results in the chat interface
 */
export function SQLQueryVisualizer({
  query,
  result,
  className,
  onPasteToNotebook,
  showPasteButton = false,
  chartExecutionOverride = false,
}: SQLQueryVisualizerProps) {
  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-md border text-sm',
        className,
      )}
    >
      {/* SQL Query Section */}
      {query && (
        <div className="bg-muted/10">
          <div className="relative min-w-0 overflow-hidden">
            <CodeBlock
              code={query}
              language="sql"
              className="[&_pre]:overflow-wrap-anywhere [&_code]:overflow-wrap-anywhere rounded-none border-0 bg-transparent [&_code]:break-words [&_code]:whitespace-pre-wrap [&_pre]:overflow-x-hidden [&_pre]:break-words [&_pre]:whitespace-pre-wrap [&>div]:min-w-0 [&>div]:overflow-x-hidden [&_pre]:bg-muted/80 dark:[&_pre]:bg-muted/90"
            >
              <CodeBlockCopyButton className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground" />
              {showPasteButton && onPasteToNotebook && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPasteToNotebook}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
                >
                  <FileText className="h-3.5 w-3.5" />
                </Button>
              )}
            </CodeBlock>
          </div>
        </div>
      )}

      {/* Query Results Section - Only show if we have columns (implies execution success) */}
      {result && result.result && (
        <div className="mt-[-1px] flex flex-col border-t">
          <div className="p-0">
            <DataGrid
              columns={result.result.columns}
              rows={result.result.rows}
              pageSize={10}
              className="rounded-none border-0 shadow-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
