'use client';

import { Skeleton } from '../shadcn/skeleton';
import { cn } from '../lib/utils';

export interface LoadingSkeletonProps {
  variant?: 'sidebar' | 'list' | 'card' | 'table';
  count?: number;
  className?: string;
}

const variantConfig = {
  sidebar: {
    container: 'space-y-1',
    item: 'flex items-center gap-2 px-2 py-1.5',
    icon: 'size-4 shrink-0 rounded',
    text: 'flex-1',
    textLine: 'h-4 w-3/4',
  },
  list: {
    container: 'space-y-2',
    item: 'flex items-center gap-4 rounded-lg border px-5 py-4',
    icon: 'size-10 shrink-0 rounded-lg',
    text: 'flex min-w-0 flex-1 flex-col gap-2',
    textLine: 'h-4 w-3/4',
  },
  card: {
    container: 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3',
    item: 'rounded-lg border p-4',
    icon: 'size-8 shrink-0 rounded-lg mb-2',
    text: 'space-y-2',
    textLine: 'h-4',
  },
  table: {
    container: 'space-y-2',
    item: 'flex items-center gap-4 border-b pb-3',
    icon: 'size-8 shrink-0 rounded',
    text: 'flex-1 space-y-2',
    textLine: 'h-4 w-full',
  },
};

export function LoadingSkeleton({
  variant = 'sidebar',
  count = 5,
  className,
}: LoadingSkeletonProps) {
  const config = variantConfig[variant];

  return (
    <div className={cn(config.container, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={config.item}>
          <Skeleton className={config.icon} />
          <div className={config.text}>
            <Skeleton className={config.textLine} />
            {variant === 'list' && (
              <Skeleton className="h-3 w-1/2" />
            )}
          </div>
          {variant === 'sidebar' && (
            <Skeleton className="size-4 shrink-0" />
          )}
        </div>
      ))}
    </div>
  );
}

