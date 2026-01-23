'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import type { ToolVariant } from '../../ai-elements/tool';

const TOOL_VARIANT_STORAGE_KEY = 'qwery-tool-variant-preference';

interface ToolVariantContextValue {
  variant: ToolVariant;
  setVariant: (variant: ToolVariant) => void;
}

const ToolVariantContext = createContext<ToolVariantContextValue | undefined>(
  undefined,
);

export function ToolVariantProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] = useState<ToolVariant>(() => {
    if (typeof window === 'undefined') {
      return 'default';
    }
    const stored = localStorage.getItem(TOOL_VARIANT_STORAGE_KEY);
    return (
      stored === 'minimal' || stored === 'default' ? stored : 'default'
    ) as ToolVariant;
  });

  useEffect(() => {
    localStorage.setItem(TOOL_VARIANT_STORAGE_KEY, variant);
  }, [variant]);

  const setVariant = (newVariant: ToolVariant) => {
    setVariantState(newVariant);
  };

  return (
    <ToolVariantContext.Provider value={{ variant, setVariant }}>
      {children}
    </ToolVariantContext.Provider>
  );
}

export function useToolVariant() {
  const context = useContext(ToolVariantContext);
  if (context === undefined) {
    throw new Error('useToolVariant must be used within a ToolVariantProvider');
  }
  return context;
}
