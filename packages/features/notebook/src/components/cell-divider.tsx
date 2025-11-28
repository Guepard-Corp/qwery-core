'use client';

import * as React from 'react';

import { BookText, Plus, Sparkles, Type } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { cn } from '@qwery/ui/utils';

interface CellDividerProps {
  onAddCell: (type: 'query' | 'text' | 'prompt') => void;
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className={cn(
              'border-border bg-background relative z-10 h-6 w-6 rounded-full border shadow-sm',
              'hover:bg-accent hover:text-accent-foreground',
              'transition-colors',
            )}
            aria-label="Add new cell"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" sideOffset={8} className="w-44">
          <DropdownMenuItem
            onSelect={() => onAddCell('query')}
            className="gap-2"
          >
            <BookText className="h-4 w-4" />
            Code cell
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onAddCell('text')}
            className="gap-2"
          >
            <Type className="h-4 w-4" />
            Markdown cell
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => onAddCell('prompt')}
            className="gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Prompt cell
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
