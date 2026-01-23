'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { cn } from '../../lib/utils';
import { ChevronRightIcon, ChevronDownIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ToolVariant } from '../../ai-elements/tool';

export interface ToolGroupProps {
  name: string;
  toolCount: number;
  children: ReactNode;
  defaultOpen?: boolean;
  variant?: ToolVariant;
  className?: string;
}

export function ToolGroup({
  name,
  toolCount,
  children,
  defaultOpen = false,
  variant = 'default',
  className,
}: ToolGroupProps) {
  const isMinimal = variant === 'minimal';

  if (isMinimal) {
    return (
      <Collapsible defaultOpen={defaultOpen} className={cn('mb-1', className)}>
        <CollapsibleTrigger className="group/header hover:text-foreground flex w-full cursor-pointer items-center gap-2 py-1.5 text-left transition-colors">
          <div className="text-muted-foreground flex size-4 shrink-0 items-center justify-center transition-transform duration-200 group-data-[state=open]/header:rotate-90">
            <ChevronRightIcon className="size-3.5" />
          </div>
          <span className="text-muted-foreground truncate text-sm font-medium">
            {name}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-border/50 ml-6 border-l pl-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        'bg-card mb-4 rounded-xl border transition-all',
        'border-white/80 dark:border-white/10',
        'hover:border-white dark:hover:border-white/20',
        className,
      )}
    >
      <CollapsibleTrigger className="group/header hover:bg-accent/50 flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-all">
        <div className="bg-muted/50 group-hover/header:bg-muted flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors">
          <ChevronDownIcon className="text-muted-foreground size-4 transition-transform duration-300 ease-out group-data-[state=open]/header:rotate-180" />
        </div>
        <div className="flex min-w-0 flex-1">
          <span className="truncate text-base font-semibold tracking-tight">
            {name}
          </span>
        </div>
        <div className="bg-muted/50 flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
          {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden">
        <div className="space-y-2 p-4 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}
