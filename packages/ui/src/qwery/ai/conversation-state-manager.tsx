'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
  useMemo,
} from 'react';
import type { UIMessage } from '@ai-sdk/react';

/**
 * Conversation state that persists across navigation
 */
interface ConversationState {
  messages: UIMessage[];
  status: 'idle' | 'streaming' | 'submitted' | 'error';
  lastUpdated: number;
  conversationSlug: string;
}

interface ConversationStateManagerContextType {
  getConversationState: (slug: string) => ConversationState | null;
  updateConversationState: (
    slug: string,
    updates: Partial<ConversationState>,
  ) => void;
  clearConversationState: (slug: string) => void;
  getActiveConversations: () => string[];
}

const ConversationStateManagerContext = createContext<
  ConversationStateManagerContextType | undefined
>(undefined);

/**
 * Conversation State Manager Provider
 *
 * This provider maintains conversation state in memory across navigation.
 * When a user navigates away from a conversation, the state is preserved.
 * When they return, the state is restored, allowing seamless continuation
 * of streaming responses.
 *
 * This is more efficient than:
 * - Re-fetching messages from DB (loses streaming state)
 * - Keeping all components mounted (memory inefficient)
 * - Storing in localStorage (size limits, serialization issues)
 */
export function ConversationStateManagerProvider({
  children,
}: {
  children: ReactNode;
}) {
  const stateMapRef = useRef<Map<string, ConversationState>>(new Map());
  const [, forceUpdate] = useState({});

  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  useEffect(() => {
    const cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const oneHourAgo = now - 60 * 60 * 1000;
        let hasChanges = false;

        for (const [slug, state] of stateMapRef.current.entries()) {
          if (state.status === 'idle' && state.lastUpdated < oneHourAgo) {
            stateMapRef.current.delete(slug);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          triggerUpdate();
        }
      },
      5 * 60 * 1000,
    ); // Check every 5 minutes

    return () => clearInterval(cleanupInterval);
  }, [triggerUpdate]);

  const getConversationState = useCallback((slug: string) => {
    return stateMapRef.current.get(slug) || null;
  }, []);

  const updateConversationState = useCallback(
    (slug: string, updates: Partial<ConversationState>) => {
      const current = stateMapRef.current.get(slug);
      const newState: ConversationState = {
        messages: current?.messages || [],
        status: current?.status || 'idle',
        lastUpdated: Date.now(),
        conversationSlug: slug,
        ...updates,
      };

      stateMapRef.current.set(slug, newState);
      triggerUpdate();
    },
    [triggerUpdate],
  );

  const clearConversationState = useCallback(
    (slug: string) => {
      stateMapRef.current.delete(slug);
      triggerUpdate();
    },
    [triggerUpdate],
  );

  const getActiveConversations = useCallback(() => {
    return Array.from(stateMapRef.current.keys());
  }, []);

  const value = useMemo(
    () => ({
      getConversationState,
      updateConversationState,
      clearConversationState,
      getActiveConversations,
    }),
    [
      getConversationState,
      updateConversationState,
      clearConversationState,
      getActiveConversations,
    ],
  );

  return (
    <ConversationStateManagerContext.Provider value={value}>
      {children}
    </ConversationStateManagerContext.Provider>
  );
}

export function useConversationStateManager() {
  const context = useContext(ConversationStateManagerContext);
  if (context === undefined) {
    throw new Error(
      'useConversationStateManager must be used within ConversationStateManagerProvider',
    );
  }
  return context;
}
