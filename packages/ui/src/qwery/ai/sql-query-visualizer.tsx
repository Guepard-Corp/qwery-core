'use client';

import * as React from 'react';
import { FileText, Download, FileJson, Copy } from 'lucide-react';
import { CodeBlock, CodeBlockCopyButton } from '../../ai-elements/code-block';
import { Button } from '../../shadcn/button';
import { cn } from '../../lib/utils';
import { DataGrid } from './data-grid';
import {
  exportTableToCSV,
  exportTableToJSON,
  tableToCSVString,
} from '@qwery/shared/export';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../shadcn/dropdown-menu';

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
  isStreaming?: boolean;
  exportFilename?: string;
}

function filenameToDisplayTitle(filename: string): string {
  return filename.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function SQLQueryVisualizer({
  query,
  result,
  className,
  onPasteToNotebook,
  showPasteButton = false,
  isStreaming = false,
  exportFilename,
}: SQLQueryVisualizerProps) {
  const downloadFilename = exportFilename
    ? `${exportFilename}-query`
    : 'query-results';
  const tableTitle = exportFilename
    ? filenameToDisplayTitle(downloadFilename)
    : 'Results';

  return (
    <div className={cn('flex w-full flex-col gap-3', className)}>
      {query && (
        <div className="relative flex w-full items-start gap-1">
          <CodeBlock code={query} language="sql" className="w-full min-w-0">
            <CodeBlockCopyButton className="text-muted-foreground hover:text-foreground h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100" />
            {showPasteButton && onPasteToNotebook && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onPasteToNotebook}
                className="h-7 w-7 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
            )}
          </CodeBlock>
          {isStreaming && (
            <span
              className="text-foreground mt-1 inline-block h-4 w-0.5 shrink-0 animate-pulse rounded-sm bg-current align-middle"
              aria-hidden
            />
          )}
        </div>
      )}

      {result?.result && (
        <div className="border-border/50 overflow-hidden rounded-lg border">
          <div className="border-border/50 flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm font-medium">
            <span>
              {tableTitle} ({result.result.rows?.length ?? 0} rows)
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  const csv = tableToCSVString({
                    columns: result.result.columns,
                    rows: result.result.rows,
                  });
                  navigator.clipboard.writeText(csv);
                }}
                title="Copy as CSV"
              >
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => e.stopPropagation()}
                    title="Export"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTableToCSV(
                        {
                          columns: result.result.columns,
                          rows: result.result.rows,
                        },
                        downloadFilename,
                      );
                    }}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      exportTableToJSON(
                        {
                          columns: result.result.columns,
                          rows: result.result.rows,
                        },
                        downloadFilename,
                        true,
                      );
                    }}
                    className="gap-2"
                  >
                    <FileJson className="h-4 w-4" />
                    JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DataGrid
            columns={result.result.columns}
            rows={result.result.rows}
            pageSize={10}
            className="rounded-none border-0 shadow-none"
          />
        </div>
      )}
    </div>
  );
}
