'use client';

import { useMemo } from 'react';
import * as React from 'react';

import { Check, Computer, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '../lib/utils';
import { Button } from '../shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../shadcn/dropdown-menu';
import { Trans } from './trans';

const MODES = ['light', 'dark', 'system'];

export function ModeToggle(props: { className?: string }) {
  const { setTheme, theme } = useTheme();

  const Items = useMemo(() => {
    return MODES.map((mode) => {
      const isSelected = theme === mode;

      return (
        <DropdownMenuItem
          className={cn('space-x-2', {
            'bg-muted': isSelected,
          })}
          key={mode}
          onClick={() => {
            setTheme(mode);
            setCookieTheme(mode);
          }}
        >
          <Icon theme={mode} selected={isSelected} />

          <span>
            <Trans i18nKey={`common:${mode}Theme`} />
          </span>
        </DropdownMenuItem>
      );
    });
  }, [setTheme, theme]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className={props.className}>
          <Sun className="h-[0.9rem] w-[0.9rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[0.9rem] w-[0.9rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">{Items}</DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SubMenuModeToggle() {
  const { setTheme, theme, resolvedTheme } = useTheme();
  const [submenuOpen, setSubmenuOpen] = React.useState(false);

  const MenuItems = useMemo(
    () =>
      MODES.map((mode) => {
        const isSelected = theme === mode;

        return (
          <DropdownMenuItem
            className={cn(
              'group relative flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors',
              isSelected ? 'bg-accent/50 text-foreground' : 'hover:bg-muted/50',
            )}
            key={mode}
            onClick={() => {
              setTheme?.(mode);
              setCookieTheme(mode);
              setSubmenuOpen(false);
            }}
          >
            <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
              <Icon theme={mode} selected={isSelected} />
            </div>

            <span
              className={cn(
                'text-[12px] font-bold tracking-tight',
                isSelected ? 'text-foreground' : 'text-foreground/80',
              )}
            >
              <Trans i18nKey={`common:${mode}Theme`} />
            </span>

            {isSelected && (
              <Check
                className="text-primary ml-auto h-4 w-4 shrink-0"
                strokeWidth={2.5}
              />
            )}
          </DropdownMenuItem>
        );
      }),
    [setTheme, theme],
  );

  return (
    <DropdownMenuSub open={submenuOpen} onOpenChange={setSubmenuOpen}>
      <DropdownMenuSubTrigger
        className="hover:bg-muted/50 flex w-full items-center justify-between rounded px-2 py-1.5 transition-colors"
        onPointerEnter={() => setSubmenuOpen(true)}
        onPointerLeave={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          if (!relatedTarget?.closest('[role="menu"]')) {
            setSubmenuOpen(false);
          }
        }}
      >
        <span className="flex items-center gap-2.5">
          <span className="bg-muted/40 flex h-7 w-7 items-center justify-center rounded shadow-inner">
            <Icon theme={resolvedTheme || theme || 'system'} selected={true} />
          </span>
          <span className="text-[12px] font-bold tracking-tight">
            <Trans i18nKey={'common:theme'} />
          </span>
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent
        className="z-[999] min-w-[10rem]"
        onPointerEnter={() => setSubmenuOpen(true)}
        onPointerLeave={() => setSubmenuOpen(false)}
      >
        {MenuItems}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

function setCookieTheme(theme: string) {
  document.cookie = `theme=${theme}; path=/; max-age=31536000; SameSite=Lax`;
}

function Icon({
  theme,
  selected,
}: {
  theme: string | undefined;
  selected: boolean;
}) {
  const colorClass = selected ? 'text-[#ffcb51]' : 'text-muted-foreground';

  switch (theme) {
    case 'light':
      return <Sun className={cn('h-3.5 w-3.5', colorClass)} />;
    case 'dark':
      return <Moon className={cn('h-3.5 w-3.5', colorClass)} />;
    case 'system':
      return <Computer className={cn('h-3.5 w-3.5', colorClass)} />;
    default:
      return <Computer className={cn('h-3.5 w-3.5', colorClass)} />;
  }
}
