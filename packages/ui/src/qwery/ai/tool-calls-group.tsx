'use client';

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../../shadcn/collapsible';
import { cn } from '../../lib/utils';
import { ChevronRightIcon } from 'lucide-react';
import { useToolVariant } from './tool-variant-context';
import type { ReactNode } from 'react';

export interface ToolCallsGroupProps {
  children: ReactNode;
  toolCount: number;
  className?: string;
}

export function ToolCallsGroup({
  children,
  toolCount,
  className,
}: ToolCallsGroupProps) {
  const { variant } = useToolVariant();
  const isMinimal = variant === 'minimal';

  if (isMinimal) {
    return (
      <Collapsible defaultOpen={false} className={cn('mb-2', className)}>
        <CollapsibleTrigger className="group/header hover:text-foreground flex w-full cursor-pointer items-center gap-2 py-1.5 text-left transition-colors">
          <div className="text-muted-foreground flex size-4 shrink-0 items-center justify-center transition-transform duration-200 group-data-[state=open]/tool:rotate-90">
            <ChevronRightIcon className="size-3.5" />
          </div>
          <span className="text-muted-foreground text-sm">
            {toolCount === 1 ? '1 tool call' : `${toolCount} tool calls`}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="border-border/50 ml-6 border-l pl-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible defaultOpen={true} className={cn('mb-4', className)}>
      <CollapsibleTrigger className="group/header bg-card hover:bg-accent/50 flex w-full cursor-pointer items-center gap-2 rounded-lg border px-4 py-3 text-left transition-all">
        <ChevronRightIcon className="text-muted-foreground size-4 transition-transform duration-200 group-data-[state=open]/tool:rotate-90" />
        <span className="text-sm font-medium">
          {toolCount === 1 ? '1 tool call' : `${toolCount} tool calls`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}
