'use client';

import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Info,
  Minus,
  Maximize2,
  X,
  Square,
  Zap,
  Code2,
  Settings2,
} from 'lucide-react';
import * as Menubar from '@radix-ui/react-menubar';
import { cn } from '@qwery/ui/utils';
import type { MenuActionId } from '../hooks/use-menu-actions';
import type { WorkspaceMode } from '@qwery/ui/workspace-mode-switch';
import { AppLogo } from '~/components/app-logo';
import {
  getWorkspaceFromLocalStorage,
  setWorkspaceInLocalStorage,
} from '@qwery/shared/workspace';

function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

type TitlebarProps = {
  onMenuAction?: (action: MenuActionId) => void;
  onBack?: () => void;
  onForward?: () => void;
  onOpenSettings?: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
  canZoomIn?: boolean;
  canZoomOut?: boolean;
};

export function Titlebar({
  onMenuAction,
  onBack,
  onForward,
  onOpenSettings,
  canGoBack = false,
  canGoForward = false,
  canZoomIn = true,
  canZoomOut = true,
}: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const [appWindow, setAppWindow] = useState<Awaited<ReturnType<typeof import('@tauri-apps/api/window').getCurrentWindow>> | null>(null);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('simple');

  useEffect(() => {
    const init = async () => {
      if (isTauri()) {
        setIsTauriEnv(true);
        const [{ getCurrentWindow }, { platform: getPlatform }] = await Promise.all([
          import('@tauri-apps/api/window'),
          import('@tauri-apps/plugin-os'),
        ]);
        setPlatform(await getPlatform());
        setAppWindow(getCurrentWindow());
      }
    };
    init();
  }, []);

  useEffect(() => {
    const workspace = getWorkspaceFromLocalStorage();
    if (workspace && workspace.mode === 'advanced') {
      setWorkspaceMode('advanced');
    } else {
      setWorkspaceMode('simple');
    }
  }, []);

  useEffect(() => {
    if (!appWindow) return;

    const checkMaximized = async () => {
      try {
        const maximized = await appWindow.isMaximized();
        setIsMaximized(maximized);
      } catch {
        // Window API might not be available
      }
    };

    checkMaximized();
    
    const unlistenPromise = appWindow.onResized(() => {
      checkMaximized();
    });

    return () => {
      unlistenPromise.then(fn => fn()).catch(() => {});
    };
  }, [appWindow]);

  const handleMinimize = async () => {
    if (!appWindow) return;
    try {
      await appWindow.minimize();
    } catch {
      // Window API might not be available
    }
  };

  const handleMaximize = async () => {
    if (!appWindow) return;
    try {
      if (isMaximized) {
        await appWindow.unmaximize();
      } else {
        await appWindow.maximize();
      }
    } catch {
      // Window API might not be available
    }
  };

  const handleClose = async () => {
    if (!appWindow) return;
    try {
      await appWindow.close();
    } catch {
      // Window API might not be available
    }
  };

  const isDarwin = platform === 'darwin';
  const titlebarClass = cn(
    'titlebar bg-sidebar border-border relative z-[999] flex h-10 w-full shrink-0 items-center justify-between border-b px-4',
    'select-none',
    platform && `platform-${platform}`,
  );

  const handleInfoClick = () => {
    try {
      if (isTauriEnv) {
        void import('@tauri-apps/plugin-opener')
          .then(({ openUrl }) => openUrl('https://qwery.run'))
          .catch(() => {
            if (typeof window !== 'undefined') {
              const url = 'https://qwery.run';
              const opened = window.open(url, '_blank', 'noopener,noreferrer');
              if (!opened) {
                window.location.href = url;
              }
            }
          });
      } else if (typeof window !== 'undefined') {
        const url = 'https://qwery.run';
        const opened = window.open(url, '_blank', 'noopener,noreferrer');
        if (!opened) {
          window.location.href = url;
        }
      }
    } catch {
      // Best-effort only
    }
  };

  const handleWorkspaceModeChange = async (mode: WorkspaceMode) => {
    try {
      const workspace = getWorkspaceFromLocalStorage();
      if (workspace) {
        setWorkspaceInLocalStorage({
          ...workspace,
          // Stored as enum in domain, but value is 'simple' | 'advanced'
          mode: mode as unknown as never,
        } as never);
      }
      setWorkspaceMode(mode);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch {
      // Best-effort only
    }
  };

  const otherOptions = (
    <div className="flex items-center gap-1">
      <button
        onClick={onOpenSettings}
        className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded transition-colors"
        aria-label="Settings"
        type="button"
      >
        <Settings2 className="h-5 w-5" />
      </button>
      <button
        onClick={() =>
          handleWorkspaceModeChange(
            workspaceMode === 'simple' ? 'advanced' : 'simple',
          )
        }
        className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded transition-colors"
        aria-label={
          workspaceMode === 'simple'
            ? 'Switch to advanced mode'
            : 'Switch to simple mode'
        }
        title={
          workspaceMode === 'simple'
            ? 'Simple mode: click to switch to Advanced mode'
            : 'Advanced mode: click to switch to Simple mode'
        }
        type="button"
      >
        {workspaceMode === 'simple' ? (
          <Zap className="h-5 w-5" />
        ) : (
          <Code2 className="h-5 w-5" />
        )}
      </button>
      <button
        onClick={handleInfoClick}
        className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded transition-colors"
        aria-label="About Qwery"
        type="button"
      >
        <Info className="h-5 w-5" />
      </button>
    </div>
  );

  const windowControls = (
    <div className="flex items-center gap-1 opacity-75">
      <button
        onClick={handleMinimize}
        className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded transition-colors"
        aria-label="Minimize"
      >
        <Minus className="h-5 w-5" />
      </button>
      <button
        onClick={handleMaximize}
        className="hover:bg-muted flex h-7 w-7 items-center justify-center rounded transition-colors"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Square className="h-5 w-5" />
        ) : (
          <Maximize2 className="h-5 w-5" />
        )}
      </button>
      <button
        onClick={handleClose}
        className="hover:bg-destructive hover:text-destructive-foreground flex h-7 w-7 items-center justify-center rounded transition-colors"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>
    </div>
  );

  const hasMenu = Boolean(onMenuAction && isTauriEnv);

  const titleBlock = (
    <div className="flex items-center gap-10">
      <div className="flex items-center gap-3">
        <AppLogo className="h-5 w-5" />
      {hasMenu && (
        <Menubar.Root
          data-tauri-drag-region="no-drag"
          className="flex h-7 items-center gap-1 rounded-md px-1 text-xs"
        >
          <Menubar.Menu>
            <Menubar.Trigger className="titlebar-menu-trigger hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
              File
            </Menubar.Trigger>
            <Menubar.Content className="bg-popover text-popover-foreground z-[1000] min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-md">
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('file_new')}
              >
                New
              </Menubar.Item>
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('file_open')}
              >
                Open…
              </Menubar.Item>
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('file_save')}
              >
                Save
              </Menubar.Item>
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('file_save_as')}
              >
                Save As…
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>

          <Menubar.Menu>
            <Menubar.Trigger className="titlebar-menu-trigger hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
              Edit
            </Menubar.Trigger>
            <Menubar.Content className="bg-popover text-popover-foreground z-[1000] min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-md">
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('edit_undo')}
              >
                Undo
              </Menubar.Item>
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('edit_redo')}
              >
                Redo
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>

          <Menubar.Menu>
            <Menubar.Trigger className="titlebar-menu-trigger hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
              View
            </Menubar.Trigger>
            <Menubar.Content className="bg-popover text-popover-foreground z-[1000] min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-md">
              <Menubar.Item
                className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:opacity-40 data-[disabled]:text-muted-foreground"
                disabled={!canZoomIn}
                onClick={() => onMenuAction?.('view_zoom_in')}
              >
                Zoom In
              </Menubar.Item>
              <Menubar.Item
                className="flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:opacity-40 data-[disabled]:text-muted-foreground"
                disabled={!canZoomOut}
                onClick={() => onMenuAction?.('view_zoom_out')}
              >
                Zoom Out
              </Menubar.Item>
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('view_actual_size')}
              >
                Actual Size
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>

        </Menubar.Root>
      )}
      </div>
      {isTauriEnv && (
        <div
          data-tauri-drag-region="no-drag"
          className="flex items-center gap-1"
        >
          <button
            onClick={onBack}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded transition-colors',
              canGoBack
                ? 'hover:bg-muted'
                : 'cursor-default opacity-40',
            )}
            aria-label="Back"
            type="button"
            disabled={!canGoBack}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <button
            onClick={onForward}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded transition-colors',
              canGoForward
                ? 'hover:bg-muted'
                : 'cursor-default opacity-40',
            )}
            aria-label="Forward"
            type="button"
            disabled={!canGoForward}
          >
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      )}
      
    </div>
  );

  if (!isTauriEnv || !appWindow) {
    return (
      <div data-tauri-drag-region className={titlebarClass}>
        {titleBlock}
        <div className="flex items-center gap-1">
          <div className="h-8 w-8" />
          <div className="h-8 w-8" />
          <div className="h-8 w-8" />
        </div>
      </div>
    );
  }

  return (
    <div data-tauri-drag-region className={titlebarClass}>
      {isDarwin ? (
        <>
          <div className="flex items-center gap-6">
            {windowControls}
            {otherOptions}
          </div>
            {titleBlock}
        </>
      ) : (
        <>
          {titleBlock}  
          <div className="flex items-center gap-6">
            {otherOptions}
            {windowControls}
          </div>
        </>
      )}
    </div>
  );
}
