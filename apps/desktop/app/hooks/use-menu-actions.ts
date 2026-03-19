'use client';

import { useEffect } from 'react';

function isTauri() {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export type MenuActionId =
  | 'file_new'
  | 'file_open'
  | 'file_save'
  | 'file_save_as'
  | 'edit_undo'
  | 'edit_redo'
  | 'view_zoom_in'
  | 'view_zoom_out'
  | 'view_actual_size'
  | 'help_about';

export function useMenuActions(handler: (action: MenuActionId) => void | Promise<void>) {
  useEffect(() => {
    if (!isTauri()) return;

    const setup = async () => {
      const { listen } = await import('@tauri-apps/api/event');
      const unlisten = await listen<string>('menu-action', (event) => {
        const id = event.payload as MenuActionId;
        void Promise.resolve(handler(id)).catch(() => {});
      });
      return unlisten;
    };

    let unlisten: (() => void) | null = null;
    setup().then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, [handler]);
}
