'use client';

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { TelemetryManager } from './types';
import type { WorkspaceContext } from './utils';

export interface OtelTelemetryContextValue {
  telemetry: TelemetryManager;
  workspace?: WorkspaceContext;
  setWorkspace: (workspace: WorkspaceContext | undefined) => void;
}

const OtelTelemetryContext = createContext<OtelTelemetryContextValue | null>(
  null,
);

export interface OtelTelemetryProviderProps {
  children: ReactNode;
  telemetry: TelemetryManager;
  initialWorkspace?: WorkspaceContext;
}

export function OtelTelemetryProvider({
  children,
  telemetry,
  initialWorkspace,
}: OtelTelemetryProviderProps) {
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
    <OtelTelemetryContext.Provider value={value}>
      {children}
    </OtelTelemetryContext.Provider>
  );
}

/**
 * Hook to access OpenTelemetry context
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { telemetry, workspace } = useOtelTelemetry();
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
export function useOtelTelemetry(): OtelTelemetryContextValue {
  const context = useContext(OtelTelemetryContext);
  if (!context) {
    throw new Error(
      'useOtelTelemetry must be used within an OtelTelemetryProvider',
    );
  }
  return context;
}

/**
 * Higher-Order Component to inject OpenTelemetry context
 *
 * @example
 * ```tsx
 * const MyComponentWithTelemetry = withOtelTelemetryContext(MyComponent);
 * ```
 */
export function withOtelTelemetryContext<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  return function TelemetryWrappedComponent(props: P) {
    const telemetry = useOtelTelemetry();
    return <Component {...props} telemetry={telemetry} />;
  };
}

// Export aliases for backward compatibility
export { OtelTelemetryProvider as TelemetryProvider };
export { useOtelTelemetry as useTelemetry };
export { withOtelTelemetryContext as withTelemetryContext };
export type { OtelTelemetryContextValue as TelemetryContextValue };
export type { OtelTelemetryProviderProps as TelemetryProviderProps };
