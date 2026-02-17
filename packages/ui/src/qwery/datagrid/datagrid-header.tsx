'use client';

import * as React from 'react';
import { Copy, Download } from 'lucide-react';
import { Button } from '../../shadcn/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../../shadcn/tooltip';
import { cn } from '../../lib/utils';

interface DataGridHeaderProps {
  title?: string;
  totalRows: number;
  duration: string;
  onDownloadCSV?: () => void;
  onCopyPage?: () => void;
  className?: string;
}

function formatNumber(num: number): string {
  return num.toLocaleString();
}

export function DataGridHeader({
  title,
  totalRows,
  duration,
  onDownloadCSV,
  onCopyPage,
  className,
}: DataGridHeaderProps) {
  const hasActions = onDownloadCSV || onCopyPage;

  return (
    <div className={cn('border-b border-white/10', className)}>
      {/* Top row: Title/timing and action icons */}
      {(title || hasActions) && (
        <div className="flex items-center justify-between p-3">
          <div className="text-xs text-white/70">
            {title && (
              <span className="font-medium">
                {title} ⏱ {duration} {formatNumber(totalRows)} rows
              </span>
            )}
          </div>

          {hasActions && (
            <TooltipProvider>
              <div className="flex items-center gap-1">
                {onDownloadCSV && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-primary h-7 w-7"
                        disabled={totalRows === 0}
                        onClick={onDownloadCSV}
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export CSV</TooltipContent>
                  </Tooltip>
                )}
                {onCopyPage && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="border-primary h-7 w-7"
                        disabled={totalRows === 0}
                        onClick={onCopyPage}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy page</TooltipContent>
                  </Tooltip>
                )}
              </div>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
}
