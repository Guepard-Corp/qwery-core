'use client';

import { Skeleton } from '../../shadcn/skeleton';
import { cn } from '../../lib/utils';

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex w-full flex-col gap-3', className)}
      data-test="chart-skeleton"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      <div className="border-border/50 overflow-hidden rounded-lg border p-4">
        <div className="flex h-[240px] w-full items-end justify-between gap-2 px-2">
          {[40, 65, 45, 80, 55, 70, 50].map((h, i) => (
            <Skeleton
              key={i}
              className="flex-1 min-w-0 rounded-t"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <Skeleton className="mt-3 h-3 w-24" />
      </div>
    </div>
  );
}

export function TableResultsSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex w-full flex-col', className)}
      data-test="table-results-skeleton"
    >
      <div className="border-border/50 flex items-center justify-between gap-2 border-b px-3 py-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-4 rounded" />
      </div>
      <div className="border-border/50 border-x border-b">
        <div className="flex gap-2 border-b px-3 py-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-3.5 flex-1 min-w-0" />
          ))}
        </div>
        {[1, 2, 3, 4, 5, 6].map((row) => (
          <div
            key={row}
            className="flex gap-2 border-border/50 border-b px-3 py-2 last:border-b-0"
          >
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-3 flex-1 min-w-0" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SchemaSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex w-full flex-col gap-4', className)}
      data-test="schema-skeleton"
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-4 w-4 rounded" />
        <Skeleton className="h-4 w-36" />
      </div>
      {[1, 2, 3].map((t) => (
        <div
          key={t}
          className="border-border/50 overflow-hidden rounded-lg border"
        >
          <div className="border-border/50 flex items-center gap-2 border-b px-3 py-2">
            <Skeleton className="h-4 w-4 shrink-0 rounded" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="space-y-2 p-3">
            {[1, 2, 3, 4].map((c) => (
              <div key={c} className="flex items-center gap-2">
                <Skeleton className="h-3 w-20 shrink-0" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function SheetSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex w-full flex-col gap-2', className)}
      data-test="sheet-skeleton"
    >
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
      <TableResultsSkeleton />
    </div>
  );
}

export function SelectChartTypeSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex w-full flex-col gap-4', className)}
      data-test="select-chart-type-skeleton"
    >
      <div className="bg-muted/30 overflow-hidden rounded-xl border p-4">
        <div className="flex items-start gap-3">
          <Skeleton className="size-8 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-full max-w-sm" />
            <Skeleton className="h-3 w-full max-w-xs" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex flex-col rounded-xl border border-border bg-card/50 p-4"
          >
            <div className="mb-3 flex items-start justify-between">
              <Skeleton className="size-10 rounded-lg" />
            </div>
            <Skeleton className="mb-1 h-4 w-20" />
            <Skeleton className="h-3 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GenericToolSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex w-full flex-col gap-3', className)}
      data-test="generic-tool-skeleton"
    >
      <Skeleton className="h-4 w-full max-w-xs" />
      <Skeleton className="h-4 w-full max-w-sm" />
      <Skeleton className="h-4 w-full max-w-[280px]" />
    </div>
  );
}
