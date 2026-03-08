import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const PERSIST_KEY = 'notebook-sidebar-open';

type NotebookSidebarOpenStore = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

function getStorage() {
  return {
    getItem: (name: string) => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.state !== 'undefined') return raw;
        const open = raw === 'true';
        return JSON.stringify({ state: { open }, version: 0 });
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => localStorage.setItem(name, value),
    removeItem: (name: string) => localStorage.removeItem(name),
  };
}

export const useNotebookSidebarOpenStore = create<NotebookSidebarOpenStore>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => set({ open }),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(getStorage),
    },
  ),
);
