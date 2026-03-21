import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { produce } from 'immer';

type SidebarSettings = { disabled: boolean; isHoverOpen: boolean };

export const SIDEBAR_DEFAULT_WIDTH_PX = 288; // 18rem
export const SIDEBAR_MIN_WIDTH_PX = 180;
export const SIDEBAR_MAX_WIDTH_PX = 480;

type SidebarStore = {
  isOpen: boolean;
  isHover: boolean;
  settings: SidebarSettings;
  width: number;
  toggleOpen: () => void;
  setIsOpen: (isOpen: boolean) => void;
  setIsHover: (isHover: boolean) => void;
  getOpenState: () => boolean;
  setSettings: (settings: Partial<SidebarSettings>) => void;
  setWidth: (width: number) => void;
};

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set, get) => ({
      isOpen: true,
      isHover: false,
      settings: { disabled: false, isHoverOpen: false },
      width: SIDEBAR_DEFAULT_WIDTH_PX,
      toggleOpen: () => set({ isOpen: !get().isOpen }),
      setIsOpen: (isOpen: boolean) => set({ isOpen }),
      setIsHover: (isHover: boolean) => set({ isHover }),
      getOpenState: () => {
        const state = get();
        return state.isOpen || (state.settings.isHoverOpen && state.isHover);
      },
      setSettings: (settings: Partial<SidebarSettings>) =>
        set(
          produce((draft: SidebarStore) => {
            draft.settings = { ...draft.settings, ...settings };
          }),
        ),
      setWidth: (width: number) => set({ width }),
    }),
    {
      name: 'sidebar',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
