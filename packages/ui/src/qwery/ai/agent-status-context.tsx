'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
} from 'react';

interface AgentStatusContextType {
  isProcessing: boolean;
  processingConversationSlug: string | null;
  setIsProcessing: (isProcessing: boolean, conversationSlug?: string) => void;
}

const AgentStatusContext = createContext<AgentStatusContextType | undefined>(
  undefined,
);

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessingState] = useState(false);
  const [processingConversationSlug, setProcessingConversationSlug] =
    useState<string | null>(null);

  const setProcessing = useCallback(
    (value: boolean, conversationSlug?: string) => {
      setIsProcessingState(value);
      setProcessingConversationSlug(value ? conversationSlug || null : null);
    },
    [],
  );

  const value = useMemo(
    () => ({
      isProcessing,
      processingConversationSlug,
      setIsProcessing: setProcessing,
    }),
    [isProcessing, processingConversationSlug, setProcessing],
  );

  return (
    <AgentStatusContext.Provider value={value}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus() {
  const context = useContext(AgentStatusContext);
  if (context === undefined) {
    return {
      isProcessing: false,
      processingConversationSlug: null,
      setIsProcessing: () => {},
    };
  }
  return context;
}
