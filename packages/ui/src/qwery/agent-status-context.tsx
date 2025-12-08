'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useCallback } from 'react';

interface AgentStatusContextType {
  isProcessing: boolean;
  setIsProcessing: (isProcessing: boolean) => void;
}

const AgentStatusContext = createContext<AgentStatusContextType | undefined>(
  undefined,
);

export function AgentStatusProvider({ children }: { children: ReactNode }) {
  const [isProcessing, setIsProcessing] = useState(false);

  const setProcessing = useCallback((value: boolean) => {
    setIsProcessing(value);
  }, []);

  const value = useMemo(
    () => ({ isProcessing, setIsProcessing: setProcessing }),
    [isProcessing, setProcessing],
  );

  return (
    <AgentStatusContext.Provider value={value}>
      {children}
    </AgentStatusContext.Provider>
  );
}

export function useAgentStatus() {
  const context = useContext(AgentStatusContext);
  // Return default values if context is not available (for optional usage)
  if (context === undefined) {
    return { isProcessing: false, setIsProcessing: () => {} };
  }
  return context;
}

