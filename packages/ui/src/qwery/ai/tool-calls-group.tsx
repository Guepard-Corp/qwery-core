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
        <CollapsibleTrigger className="group/header flex w-full cursor-pointer items-center gap-2 py-1.5 text-left transition-colors hover:text-foreground">
          <div className="flex size-4 shrink-0 items-center justify-center text-muted-foreground transition-transform duration-200 group-data-[state=open]/tool:rotate-90">
            <ChevronRightIcon className="size-3.5" />
          </div>
          <span className="text-sm text-muted-foreground">
            {toolCount === 1
              ? '1 tool call'
              : `${toolCount} tool calls`}
          </span>
        </CollapsibleTrigger>
        <CollapsibleContent className="ml-6 border-l border-border/50 pl-2">
          {children}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <Collapsible defaultOpen={true} className={cn('mb-4', className)}>
      <CollapsibleTrigger className="group/header flex w-full cursor-pointer items-center gap-2 rounded-lg border bg-card px-4 py-3 text-left transition-all hover:bg-accent/50">
        <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/tool:rotate-90" />
        <span className="text-sm font-medium">
          {toolCount === 1
            ? '1 tool call'
            : `${toolCount} tool calls`}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2 space-y-2">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

