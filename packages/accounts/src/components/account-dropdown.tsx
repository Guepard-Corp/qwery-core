'use client';

import * as React from 'react';
import { Link } from 'react-router';

import {
  ChevronsUpDown,
  Code2,
  FileText,
  Home,
  MessageCircleQuestion,
  User,
  Zap,
  Check,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { ProfileAvatar } from '@qwery/ui/profile-avatar';
import { SubMenuModeToggle } from '@qwery/ui/mode-toggle';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';

export function AccountDropdown({
  paths,
  workspaceMode,
  onWorkspaceModeChange,
}: {
  paths: {
    home: string;
  };
  workspaceMode?: 'simple' | 'advanced';
  onWorkspaceModeChange?: (mode: 'simple' | 'advanced') => void;
}) {
  const displayName = 'Guepard';
  const signedInAsLabel = 'Anonymous User';
  const pictureUrl = 'https://github.com/guepard.png';
  const currentMode = workspaceMode || 'simple';
  const [workspaceSubmenuOpen, setWorkspaceSubmenuOpen] = React.useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open your profile menu"
        data-test={'account-dropdown-trigger'}
        className={cn(
          'animate-in fade-in focus:outline-primary flex cursor-pointer items-center justify-center duration-500',
          'active:bg-secondary/50 hover:bg-secondary items-center gap-4 rounded-md p-2 transition-colors',
          'group-data-[minimized=true]:p-1.5 group-data-[minimized=true]:px-0',
        )}
      >
        <ProfileAvatar
          className="size-8 rounded-md group-data-[minimized=true]:size-7"
          fallbackClassName="rounded-md border"
          displayName=""
          pictureUrl={pictureUrl}
        />
        <div
          className={
            'fade-in animate-in flex w-full flex-col truncate text-left group-data-[minimized=true]:hidden'
          }
        >
          <span
            data-test={'account-dropdown-display-name'}
            className={'truncate text-[13px] font-semibold'}
          >
            {displayName}
          </span>

          <span
            data-test={'account-dropdown-email'}
            className={'text-muted-foreground truncate text-xs'}
          >
            {signedInAsLabel}
          </span>
        </div>

        <ChevronsUpDown
          className={
            'text-muted-foreground mr-1 h-4 w-4 shrink-0 group-data-[minimized=true]:hidden'
          }
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent className={'w-[240px] p-1.5 xl:!min-w-[15rem]'}>
        {/* Header: signed-in user */}
        <div className="flex items-center gap-2.5 px-2 py-2">
          <div className="bg-muted/40 flex h-8 w-8 shrink-0 items-center justify-center rounded shadow-inner">
            <User className="text-muted-foreground h-3.5 w-3.5" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[12px] font-bold tracking-tight">
              {displayName}
            </span>
            <span className="text-muted-foreground truncate text-[11px]">
              <Trans i18nKey={'common:signedInAs'} /> {signedInAsLabel}
            </span>
          </div>
        </div>

        <DropdownMenuSeparator />

        {/* Nav items */}
        <DropdownMenuItem asChild>
          <Link
            className={
              'group hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors'
            }
            to={paths.home}
          >
            <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
              <Home className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <span className="text-foreground/80 text-[12px] font-bold tracking-tight">
              <Trans i18nKey={'common:routes.home'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            className={
              'group hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors'
            }
            to={'https://docs.guepard.run'}
            target={'_blank'}
          >
            <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
              <MessageCircleQuestion className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <span className="text-foreground/80 text-[12px] font-bold tracking-tight">
              <Trans i18nKey={'common:documentation'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            className={
              'group hover:bg-muted/50 flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors'
            }
            to={'https://guepard.featurebase.app/changelog'}
            target={'_blank'}
          >
            <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
              <FileText className="text-muted-foreground h-3.5 w-3.5" />
            </div>
            <span className="text-foreground/80 text-[12px] font-bold tracking-tight">
              <Trans i18nKey={'common:changelog'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <SubMenuModeToggle />
        <DropdownMenuSeparator />

        {/* Workspace Mode */}
        <DropdownMenuSub
          open={workspaceSubmenuOpen}
          onOpenChange={setWorkspaceSubmenuOpen}
        >
          <DropdownMenuSubTrigger
            className="flex w-full items-center justify-between"
            onPointerEnter={() => setWorkspaceSubmenuOpen(true)}
            onPointerLeave={(e) => {
              const relatedTarget = e.relatedTarget as HTMLElement;
              if (!relatedTarget?.closest('[role="menu"]')) {
                setWorkspaceSubmenuOpen(false);
              }
            }}
          >
            <span className="flex items-center gap-2.5">
              <span className="bg-muted/40 flex h-7 w-7 items-center justify-center rounded shadow-inner">
                {currentMode === 'simple' ? (
                  <Zap className="h-3.5 w-3.5 text-[#ffcb51]" />
                ) : (
                  <Code2 className="h-3.5 w-3.5 text-[#ffcb51]" />
                )}
              </span>
              <span className="text-[12px] font-bold tracking-tight">
                Workspace Mode
              </span>
            </span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="z-[999] min-w-[10rem]">
            <div className="space-y-0.5">
              <DropdownMenuItem
                className={cn(
                  'group relative flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors',
                  currentMode === 'simple'
                    ? 'bg-accent/50 text-foreground'
                    : 'hover:bg-muted/50',
                )}
                onClick={() => {
                  onWorkspaceModeChange?.('simple');
                  setWorkspaceSubmenuOpen(false);
                }}
              >
                <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
                  <Zap
                    className={cn(
                      'h-3.5 w-3.5',
                      currentMode === 'simple'
                        ? 'text-[#ffcb51]'
                        : 'text-muted-foreground',
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[12px] font-bold tracking-tight',
                    currentMode === 'simple'
                      ? 'text-foreground'
                      : 'text-foreground/80',
                  )}
                >
                  Simple mode
                </span>
                {currentMode === 'simple' && (
                  <Check
                    className="text-primary ml-auto h-4 w-4 shrink-0"
                    strokeWidth={2.5}
                  />
                )}
              </DropdownMenuItem>

              <DropdownMenuItem
                className={cn(
                  'group relative flex cursor-pointer items-center gap-2.5 rounded px-2 py-1.5 transition-colors',
                  currentMode === 'advanced'
                    ? 'bg-accent/50 text-foreground'
                    : 'hover:bg-muted/50',
                )}
                onClick={() => {
                  onWorkspaceModeChange?.('advanced');
                  setWorkspaceSubmenuOpen(false);
                }}
              >
                <div className="bg-muted/40 group-hover:bg-background flex h-7 w-7 shrink-0 items-center justify-center rounded shadow-inner">
                  <Code2
                    className={cn(
                      'h-3.5 w-3.5',
                      currentMode === 'advanced'
                        ? 'text-[#ffcb51]'
                        : 'text-muted-foreground',
                    )}
                  />
                </div>
                <span
                  className={cn(
                    'text-[12px] font-bold tracking-tight',
                    currentMode === 'advanced'
                      ? 'text-foreground'
                      : 'text-foreground/80',
                  )}
                >
                  Advanced mode
                </span>
                {currentMode === 'advanced' && (
                  <Check
                    className="text-primary ml-auto h-4 w-4 shrink-0"
                    strokeWidth={2.5}
                  />
                )}
              </DropdownMenuItem>
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
