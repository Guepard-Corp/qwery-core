'use client';

import * as React from 'react';
import { ChevronDown, FileText } from 'lucide-react';
import { CodeBlock, CodeBlockCopyButton } from '../../ai-elements/code-block';
import { Button } from '../../shadcn/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
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
  isStreaming?: boolean;
}

export function SQLQueryVisualizer({
  query,
  result,
  className,
  onPasteToNotebook,
  showPasteButton = false,
  isStreaming = false,
}: SQLQueryVisualizerProps) {
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
        <Collapsible
          defaultOpen
          className="border-border/50 overflow-hidden rounded-lg border"
        >
          <CollapsibleTrigger className="border-border/50 hover:bg-muted/50 flex w-full items-center justify-between gap-2 border-b px-3 py-2 text-left text-sm font-medium transition-colors [&[data-state=open]>svg]:rotate-180">
            <span>Results ({result.result.rows?.length ?? 0} rows)</span>
            <ChevronDown className="text-muted-foreground size-4 shrink-0 transition-transform duration-200" />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <DataGrid
              columns={result.result.columns}
              rows={result.result.rows}
              pageSize={10}
              className="rounded-none border-0 shadow-none"
            />
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
