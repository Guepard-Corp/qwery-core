'use client';

import { useEffect, useState } from 'react';
import { Minimize, Maximize, X, Square } from 'lucide-react';
import * as Menubar from '@radix-ui/react-menubar';
import { cn } from '@qwery/ui/utils';
import type { MenuActionId } from '../hooks/use-menu-actions';

function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

type TitlebarProps = {
  onMenuAction?: (action: MenuActionId) => void;
};

export function Titlebar({ onMenuAction }: TitlebarProps) {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isTauriEnv, setIsTauriEnv] = useState(false);
  const [platform, setPlatform] = useState<string>('');
  const [appWindow, setAppWindow] = useState<Awaited<ReturnType<typeof import('@tauri-apps/api/window').getCurrentWindow>> | null>(null);

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
    'bg-sidebar border-border relative z-[999] flex h-10 w-full shrink-0 items-center justify-between border-b px-4',
    'select-none',
    platform && `platform-${platform}`,
  );

  const windowControls = (
    <div className="flex items-center gap-1">
      <button
        onClick={handleMinimize}
        className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded transition-colors"
        aria-label="Minimize"
      >
        <Minimize className="h-4 w-4" />
      </button>
      <button
        onClick={handleMaximize}
        className="hover:bg-muted flex h-8 w-8 items-center justify-center rounded transition-colors"
        aria-label={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <Square className="h-3.5 w-3.5" />
        ) : (
          <Maximize className="h-4 w-4" />
        )}
      </button>
      <button
        onClick={handleClose}
        className="hover:bg-destructive hover:text-destructive-foreground flex h-8 w-8 items-center justify-center rounded transition-colors"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const hasMenu = Boolean(onMenuAction && isTauriEnv);

  const titleBlock = (
    <div className="flex items-center gap-3">
      <div className="text-foreground text-sm font-semibold">Qwery</div>
      {hasMenu && (
        <Menubar.Root
          data-tauri-drag-region="no-drag"
          className="flex h-7 items-center gap-1 rounded-md px-1 text-xs"
        >
          <Menubar.Menu>
            <Menubar.Trigger className="hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
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
            <Menubar.Trigger className="hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
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
            <Menubar.Trigger className="hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
              View
            </Menubar.Trigger>
            <Menubar.Content className="bg-popover text-popover-foreground z-[1000] min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-md">
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('view_zoom_in')}
              >
                Zoom In
              </Menubar.Item>
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
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

          <Menubar.Menu>
            <Menubar.Trigger className="hover:bg-muted/70 data-[state=open]:bg-muted/90 rounded px-2 py-1">
              Help
            </Menubar.Trigger>
            <Menubar.Content className="bg-popover text-popover-foreground z-[1000] min-w-[10rem] overflow-hidden rounded-md border p-1 shadow-md">
              <Menubar.Item
                className="focus:bg-accent focus:text-accent-foreground flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-xs outline-none"
                onClick={() => onMenuAction?.('help_about')}
              >
                About Qwery
              </Menubar.Item>
            </Menubar.Content>
          </Menubar.Menu>
        </Menubar.Root>
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
          {windowControls}
          {titleBlock}
        </>
      ) : (
        <>
          {titleBlock}
          {windowControls}
        </>
      )}
    </div>
  );
}
