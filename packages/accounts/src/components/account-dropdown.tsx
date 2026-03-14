'use client';

import { Link } from 'react-router';

import {
  ChevronsUpDown,
  Code2,
  FileText,
  Home,
  MessageCircleQuestion,
  User,
  Zap,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qwery/ui/dropdown-menu';
import { ProfileAvatar } from '@qwery/ui/profile-avatar';
import { SubMenuModeToggle } from '@qwery/ui/mode-toggle';
import { SubMenuSearchEngineSelect } from '@qwery/ui/search-engine-select';
import { Trans } from '@qwery/ui/trans';
import { cn } from '@qwery/ui/utils';
import type { SearchEngine } from '@qwery/ui/ai';

export function AccountDropdown({
  paths,
  workspaceMode,
  onWorkspaceModeChange,
  preferredSearchEngine = 'google',
  onPreferredSearchEngineChange,
}: {
  paths: {
    home: string;
  };
  workspaceMode?: 'simple' | 'advanced';
  onWorkspaceModeChange?: (mode: 'simple' | 'advanced') => void;
  preferredSearchEngine?: SearchEngine;
  onPreferredSearchEngineChange?: (engine: SearchEngine) => void;
}) {
  const displayName = 'Guepard';
  const signedInAsLabel = 'Anonymous User';
  const pictureUrl = 'https://github.com/guepard.png';
  const currentMode = workspaceMode || 'simple';

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
            className={'truncate text-sm'}
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
            'text-muted-foreground mr-1 h-8 group-data-[minimized=true]:hidden'
          }
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent className={'xl:!min-w-[15rem]'}>
        <DropdownMenuItem
          className={'flex !h-10 items-start gap-2 rounded-none'}
        >
          <User className={'text-muted-foreground mt-0.5 h-5 shrink-0'} />
          <div
            className={'flex flex-col justify-start truncate text-left text-xs'}
          >
            <div className={'text-muted-foreground'}>
              <Trans i18nKey={'common:signedInAs'} />
            </div>

            <div>
              <span className={'block truncate'}>{signedInAsLabel}</span>
            </div>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            className={'s-full flex items-center space-x-2'}
            to={paths.home}
          >
            <Home className={'h-5'} />

            <span>
              <Trans i18nKey={'common:routes.home'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            className={'s-full flex items-center space-x-2'}
            to={'https://docs.guepard.run'}
            target={'_blank'}
          >
            <MessageCircleQuestion className={'h-5'} />

            <span>
              <Trans i18nKey={'common:documentation'} />
            </span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuItem asChild>
          <Link
            className={'s-full flex items-center space-x-2'}
            to={'https://guepard.featurebase.app/changelog'}
            target={'_blank'}
          >
            <FileText className={'h-5'} />

            <span>
              <Trans i18nKey={'common:changelog'} />
            </span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <SubMenuModeToggle />
        <SubMenuSearchEngineSelect
          value={preferredSearchEngine}
          onValueChange={(engine) => onPreferredSearchEngineChange?.(engine)}
        />
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5">
          <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
            Workspace Mode
          </p>
          <div className="space-y-1">
            <DropdownMenuItem
              className={cn(
                'flex cursor-pointer items-center gap-2',
                currentMode === 'simple' && 'bg-accent',
              )}
              onClick={() => onWorkspaceModeChange?.('simple')}
            >
              <Zap
                className={cn(
                  'h-4 w-4',
                  currentMode === 'simple'
                    ? 'text-[#ffcb51]'
                    : 'text-muted-foreground',
                )}
              />
              <span>Simple mode</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className={cn(
                'flex cursor-pointer items-center gap-2',
                currentMode === 'advanced' && 'bg-accent',
              )}
              onClick={() => onWorkspaceModeChange?.('advanced')}
            >
              <Code2
                className={cn(
                  'h-4 w-4',
                  currentMode === 'advanced'
                    ? 'text-[#ffcb51]'
                    : 'text-muted-foreground',
                )}
              />
              <span>Advanced mode</span>
            </DropdownMenuItem>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
