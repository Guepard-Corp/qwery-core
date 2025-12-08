/**
 * Telemetry Context for React Applications
 * 
 * Provides React context wrapper for web/desktop apps.
 * Automatically injects workspace/session attributes into events and spans.
 */

'use client';

import React, { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { TelemetryManager } from './telemetry-manager';
import type { WorkspaceContext } from './telemetry-utils';

export interface TelemetryContextValue {
  telemetry: TelemetryManager;
  workspace?: WorkspaceContext;
  setWorkspace: (workspace: WorkspaceContext | undefined) => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

export interface TelemetryProviderProps {
  children: ReactNode;
  telemetry: TelemetryManager;
  initialWorkspace?: WorkspaceContext;
}

/**
 * Telemetry Provider Component
 * 
 * Wraps the application and provides telemetry context to all children.
 * Automatically enriches events and spans with workspace context.
 */
export function TelemetryProvider({
  children,
  telemetry,
  initialWorkspace,
}: TelemetryProviderProps) {
  const [workspace, setWorkspaceState] = useState<WorkspaceContext | undefined>(
    initialWorkspace,
  );

  const setWorkspace = (newWorkspace: WorkspaceContext | undefined) => {
    setWorkspaceState(newWorkspace);
  };

  const value = useMemo(
    () => ({
      telemetry,
      workspace,
      setWorkspace,
    }),
    [telemetry, workspace],
  );

  return (
    <TelemetryContext.Provider value={value}>
      {children}
    </TelemetryContext.Provider>
  );
}

/**
 * Hook to access telemetry context
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { telemetry, workspace } = useTelemetry();
 *   
 *   const handleClick = () => {
 *     telemetry.captureEvent({
 *       name: 'ui.button.click',
 *       attributes: { button: 'submit' },
 *     });
 *   };
 *   
 *   return <button onClick={handleClick}>Submit</button>;
 * }
 * ```
 */
export function useTelemetry(): TelemetryContextValue {
  const context = useContext(TelemetryContext);
  if (!context) {
    throw new Error('useTelemetry must be used within a TelemetryProvider');
  }
  return context;
}

/**
 * Higher-Order Component to inject telemetry context
 * 
 * @example
 * ```tsx
 * const MyComponentWithTelemetry = withTelemetryContext(MyComponent);
 * ```
 */
export function withTelemetryContext<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function TelemetryWrappedComponent(props: P) {
    const telemetry = useTelemetry();
    return <Component {...props} telemetry={telemetry} />;
  };
}

