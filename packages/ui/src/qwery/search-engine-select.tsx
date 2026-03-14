'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import {
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '../shadcn/dropdown-menu';
import {
  type SearchEngine,
  SEARCH_ENGINES,
  SEARCH_ENGINE_IDS,
  SearchEngineIcon,
} from './ai/web-fetch-visualizer';

export function SubMenuSearchEngineSelect({
  value,
  onValueChange,
}: {
  value: SearchEngine;
  onValueChange: (engine: SearchEngine) => void;
}) {
  const [submenuOpen, setSubmenuOpen] = React.useState(false);

  const menuItems = React.useMemo(
    () =>
      SEARCH_ENGINE_IDS.map((id) => {
        const isSelected = value === id;
        return (
          <DropdownMenuItem
            className={cn('flex items-center space-x-2', {
              'bg-muted': isSelected,
            })}
            key={id}
            onClick={() => {
              onValueChange(id);
              setSubmenuOpen(false);
            }}
          >
            <SearchEngineIcon engine={id} />
            <span>{SEARCH_ENGINES[id].name}</span>
          </DropdownMenuItem>
        );
      }),
    [value, onValueChange],
  );

  return (
    <DropdownMenuSub open={submenuOpen} onOpenChange={setSubmenuOpen}>
      <DropdownMenuSubTrigger
        className="flex w-full items-center justify-between"
        onPointerEnter={() => setSubmenuOpen(true)}
        onPointerLeave={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget?.closest('[role="menu"]')) {
            setSubmenuOpen(false);
          }
        }}
      >
        <span className="flex items-center space-x-2">
          <SearchEngineIcon engine={value} />
          <span>Search engine</span>
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className="z-[999] min-w-[10rem]"
        onPointerEnter={() => setSubmenuOpen(true)}
        onPointerLeave={() => setSubmenuOpen(false)}
      >
        {menuItems}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
