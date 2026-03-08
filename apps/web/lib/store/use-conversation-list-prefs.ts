import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const PERSIST_KEY = 'conversation-list-prefs';
const OLD_BOOKMARKS_KEY = 'bookmarked-conversations';
const OLD_SELECTION_KEY = 'conversation-selection-order';
const MAX_SELECTION_ENTRIES = 100;

type ConversationListPrefsState = {
  bookmarkedIds: string[];
  selectionOrder: Record<string, number>;
};

type ConversationListPrefsStore = ConversationListPrefsState & {
  toggleBookmark: (id: string) => void;
  touchSelectionOrder: (conversationId: string) => void;
};

function getStorage() {
  return {
    getItem: (name: string) => {
      const raw = localStorage.getItem(name);
      if (raw) return raw;
      try {
        const bookmarksRaw = localStorage.getItem(OLD_BOOKMARKS_KEY);
        const selectionRaw = localStorage.getItem(OLD_SELECTION_KEY);
        if (!bookmarksRaw && !selectionRaw) return null;
        const bookmarkedIds = bookmarksRaw
          ? (JSON.parse(bookmarksRaw) as string[])
          : [];
        let selectionOrder: Record<string, number> = {};
        if (selectionRaw) {
          const data = JSON.parse(selectionRaw);
          if (Array.isArray(data)) {
            data.forEach((id: string, index: number) => {
              selectionOrder[id] = Date.now() - index * 1000;
            });
          } else if (data && typeof data === 'object') {
            selectionOrder = data as Record<string, number>;
          }
        }
        return JSON.stringify({
          state: { bookmarkedIds, selectionOrder },
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

export const useConversationListPrefsStore =
  create<ConversationListPrefsStore>()(
    persist(
      (set) => ({
        bookmarkedIds: [],
        selectionOrder: {},
        toggleBookmark: (id) =>
          set((state) => {
            const has = state.bookmarkedIds.includes(id);
            const bookmarkedIds = has
              ? state.bookmarkedIds.filter((x) => x !== id)
              : [...state.bookmarkedIds, id];
            return { bookmarkedIds };
          }),
        touchSelectionOrder: (conversationId) =>
          set((state) => {
            const next = {
              ...state.selectionOrder,
              [conversationId]: Date.now(),
            };
            if (Object.keys(next).length <= MAX_SELECTION_ENTRIES) {
              return { selectionOrder: next };
            }
            const entries = Object.entries(next).sort((a, b) => b[1] - a[1]);
            const trimmed = entries.slice(0, MAX_SELECTION_ENTRIES);
            return {
              selectionOrder: Object.fromEntries(trimmed),
            };
          }),
      }),
      {
        name: PERSIST_KEY,
        storage: createJSONStorage(getStorage),
      },
    ),
  );
