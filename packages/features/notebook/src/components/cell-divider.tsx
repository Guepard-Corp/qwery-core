'use client';

import * as React from 'react';

import { Plus, Sparkles } from 'lucide-react';

import { Button } from '@qwery/ui/button';
import { cn } from '@qwery/ui/utils';

interface CellDividerProps {
  onAddCell: (type: 'query' | 'text' | 'prompt') => void;
  className?: string;
}

export function CellDivider({ onAddCell, className }: CellDividerProps) {
  return (
    <div
      className={cn(
        'group relative my-1 flex h-4 w-full items-center justify-center transition-all duration-300',
        className,
      )}
    >
      <div className="via-border via-border absolute inset-x-0 h-px bg-gradient-to-r from-transparent to-transparent" />

      <div className="relative z-10 flex translate-y-1 transform items-center gap-2 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
        <Button
          size="sm"
          variant="secondary"
          className="bg-background hover:bg-accent h-7 gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          onClick={() => onAddCell('query')}
        >
          <Plus className="h-3.5 w-3.5" />
          Code
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-background hover:bg-accent h-7 gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          onClick={() => onAddCell('text')}
        >
          <Plus className="h-3.5 w-3.5" />
          Markdown
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="bg-background hover:bg-accent h-7 gap-1.5 rounded-full border px-3 text-[11px] font-semibold shadow-sm transition-all duration-200 hover:shadow-md active:scale-95"
          onClick={() => onAddCell('prompt')}
        >
          <Sparkles className="h-3.5 w-3.5" />
          Prompt
        </Button>
      </div>
    </div>
  );
}
