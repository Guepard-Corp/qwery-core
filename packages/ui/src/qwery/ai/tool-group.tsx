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
        <CollapsibleTrigger className="group/header flex w-full cursor-pointer items-center gap-2 py-1.5 text-left transition-colors hover:text-foreground">
          <div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-transform duration-200 group-data-[state=open]/header:rotate-90">
            <ChevronRightIcon className="size-3.5" />
          </div>
          <span className="truncate text-sm font-medium text-muted-foreground">
            {name}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-6 border-l border-border/50 pl-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible
      defaultOpen={defaultOpen}
      className={cn(
        'mb-4 rounded-xl border bg-card transition-all',
        'border-white/80 dark:border-white/10',
        'hover:border-white dark:hover:border-white/20',
        className,
      )}
    >
      <CollapsibleTrigger className="group/header flex w-full cursor-pointer items-center gap-4 px-5 py-4 text-left transition-all hover:bg-accent/50">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/50 transition-colors group-hover/header:bg-muted">
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform duration-300 ease-out group-data-[state=open]/header:rotate-180" />
        </div>
        <div className="flex min-w-0 flex-1">
          <span className="truncate text-base font-semibold tracking-tight">
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-muted/50 px-3 py-1.5 text-xs font-medium">
          {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className="space-y-2 p-4 pt-0">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

