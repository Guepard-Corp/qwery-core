'use client';

import { createContext, useCallback, useContext, useRef } from 'react';

type EmptyPayload = NonNullable<unknown>;

// Base event types
export interface BaseAppEventTypes {
  'user.signedIn': { userId: string };
  'user.signedUp': { method: `magiclink` | `password` };
  'user.updated': EmptyPayload;
  'checkout.started': { planId: string; account?: string };

  // Add more base event types here
}

export type ConsumerProvidedEventTypes = EmptyPayload;

// Helper type for extending event types
export type ExtendedAppEventTypes<
  T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes,
> = BaseAppEventTypes & T;

// Generic type for the entire module
export type AppEventType<T extends ConsumerProvidedEventTypes> =
  keyof ExtendedAppEventTypes<T>;

export type AppEvent<
  T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes,
  K extends AppEventType<T> = AppEventType<T>,
> = {
  type: K;
  payload: ExtendedAppEventTypes<T>[K];
};

export type EventCallback<
  T extends ConsumerProvidedEventTypes,
  K extends AppEventType<T> = AppEventType<T>,
> = (event: AppEvent<T, K>) => void;

interface InternalAppEventsContextType<
  T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes,
  K extends AppEventType<T> = AppEventType<T>,
> {
  emit: (event: AppEvent<never, never>) => void;
  on: (eventType: K, callback: EventCallback<T, K>) => void;
  off: (eventType: K, callback: EventCallback<T, K>) => void;
}

interface AppEventsContextType<T extends ConsumerProvidedEventTypes> {
  emit: <K extends AppEventType<T>>(event: AppEvent<T, K>) => void;

  on: <K extends AppEventType<T>>(
    eventType: K,
    callback: EventCallback<T, K>,
  ) => void;

  off: <K extends AppEventType<T>>(
    eventType: K,
    callback: EventCallback<T, K>,
  ) => void;
}

const AppEventsContext = createContext<InternalAppEventsContextType | null>(
  null,
);

export function AppEventsProvider<
  T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes,
  K extends AppEventType<T> = AppEventType<T>,
>({ children }: React.PropsWithChildren) {
  const listeners = useRef<Record<K, EventCallback<T, K>[]>>(
    {} as Record<K, EventCallback<T, K>[]>,
  );

  const emit = useCallback(
    (event: AppEvent<T, K>) => {
      const eventListeners = listeners.current[event.type] ?? [];

      eventListeners.forEach((callback) => callback(event));
    },
    [listeners],
  );

  const on = useCallback((eventType: K, callback: EventCallback<T, K>) => {
    listeners.current = {
      ...listeners.current,
      [eventType]: [...(listeners.current[eventType] ?? []), callback],
    };
  }, []) as AppEventsContextType<T>['on'];

  const off = useCallback((eventType: K, callback: EventCallback<T, K>) => {
    listeners.current = {
      ...listeners.current,
      [eventType]: (listeners.current[eventType] ?? []).filter(
        (cb) => cb !== callback,
      ),
    };
  }, []) as AppEventsContextType<T>['off'];

  return (
    <AppEventsContext.Provider value={{ emit, on, off }}>
      {children}
    </AppEventsContext.Provider>
  );
}

export function useAppEvents<
  T extends ConsumerProvidedEventTypes = ConsumerProvidedEventTypes,
>(): AppEventsContextType<T> {
  const context = useContext(AppEventsContext);

  if (!context) {
    throw new Error('useAppEvents must be used within an AppEventsProvider');
  }

  return context as AppEventsContextType<T>;
}
