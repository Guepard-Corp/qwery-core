import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const STORAGE_KEY = 'sidebar:collapsible-state';

type SidebarNavStore = {
  groupOpen: Record<string, boolean>;
  setGroupOpen: (label: string, open: boolean) => void;
};

function getStorage() {
  return {
    getItem: (name: string) => {
      const raw = localStorage.getItem(name);
      if (!raw) return null;
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.state !== 'undefined') return raw;
        return JSON.stringify({
          state: { groupOpen: parsed as Record<string, boolean> },
          version: 0,
        });
      } catch {
        return null;
      }
    },
    setItem: (name: string, value: string) => localStorage.setItem(name, value),
    removeItem: (name: string) => localStorage.removeItem(name),
  };
}

export const useSidebarNavStore = create<SidebarNavStore>()(
  persist(
    (set) => ({
      groupOpen: {},
      setGroupOpen: (label, open) =>
        set((state) => ({
          groupOpen: { ...state.groupOpen, [label]: open },
        })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(getStorage),
    },
  ),
);
