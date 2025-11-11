'use client';

import * as React from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { cn } from '@qwery/ui/utils';

interface CellDividerProps {
  onAddCell: () => void;
  className?: string;
}

export function CellDivider({ onAddCell, className }: CellDividerProps) {
  return (
    <div
      className={cn(
        'group border-border bg-background relative flex h-8 w-full items-center justify-center border-b',
        className,
      )}
    >
      <div className="bg-border absolute inset-x-0 top-1/2 h-px" />
      <Button
        size="icon"
        variant="ghost"
        className={cn(
          'border-border bg-background relative z-10 h-6 w-6 rounded-full border shadow-sm',
          'hover:bg-accent hover:text-accent-foreground',
          'transition-colors',
        )}
        onClick={onAddCell}
        aria-label="Add new cell"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  );
}
