/**
 * Shared Realtime Context
 *
 * Both RealtimeProvider (WebSocket) and ConvexRealtimeProvider (Convex) provide
 * this context. Hooks (useRealtimeListing, useRealtimeStatus, etc.) consume it.
 * ConvexRealtimeProvider gives real isConnected, no-op subscribe; RealtimeProvider
 * gives real subscribe for legacy WebSocket events.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type {
  RealtimeEvent,
  RealtimeEventHandler,
  RealtimeEventType,
} from '@digilist-saas/shared/types';
import type { RealtimeProviderInterface } from './RealtimeProviderInterface';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RealtimeContextValue extends RealtimeProviderInterface {
  /** Whether connected to realtime server */
  isConnected: boolean;
  /** Connection status */
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  /** Last error if any */
  error: string | null;
  /** Connect to realtime server */
  connect: () => void;
  /** Disconnect from realtime server */
  disconnect: () => void;
  /** Subscribe to event type */
  subscribe: (eventType: RealtimeEventType | '*', handler: RealtimeEventHandler) => () => void;
  /** Last received events by type */
  lastEvents: Map<RealtimeEventType, RealtimeEvent>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error(
      'useRealtimeContext must be used within RealtimeProvider or ConvexRealtimeProvider'
    );
  }
  return context;
}

// ---------------------------------------------------------------------------
// Event-specific Hooks
// ---------------------------------------------------------------------------

/** Subscribe to listing events */
export function useRealtimeListing(handler: RealtimeEventHandler): void {
  const { subscribe } = useRealtimeContext();
  useEffect(() => {
    const unsubscribe = subscribe('listing', handler);
    return unsubscribe;
  }, [subscribe, handler]);
}

/** Subscribe to audit events */
export function useRealtimeAudit(handler: RealtimeEventHandler): void {
  const { subscribe } = useRealtimeContext();
  useEffect(() => {
    const unsubscribe = subscribe('audit', handler);
    return unsubscribe;
  }, [subscribe, handler]);
}

/** Subscribe to notification events */
export function useRealtimeNotification(handler: RealtimeEventHandler): void {
  const { subscribe } = useRealtimeContext();
  useEffect(() => {
    const unsubscribe = subscribe('notification', handler);
    return unsubscribe;
  }, [subscribe, handler]);
}

/** Subscribe to message events */
export function useRealtimeMessage(handler: RealtimeEventHandler): void {
  const { subscribe } = useRealtimeContext();
  useEffect(() => {
    const unsubscribe = subscribe('message', handler);
    return unsubscribe;
  }, [subscribe, handler]);
}

/** Subscribe to all events */
export function useRealtimeAll(handler: RealtimeEventHandler): void {
  const { subscribe } = useRealtimeContext();
  useEffect(() => {
    const unsubscribe = subscribe('*', handler);
    return unsubscribe;
  }, [subscribe, handler]);
}

/** Get connection status */
export function useRealtimeStatus(): {
  isConnected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
} {
  const { isConnected, status, error } = useRealtimeContext();
  return { isConnected, status, error };
}

/** Alias for useRealtimeStatus — apps use this for provider-agnostic realtime UI */
export const useRealtime = useRealtimeStatus;

/** Subscribe to realtime updates for a specific listing */
export interface UseRealtimeListingUpdatesResult {
  isConnected: boolean;
  lastEvent: RealtimeEvent | null;
}

export function useRealtimeListingUpdates(
  listingId: string,
  onUpdate?: RealtimeEventHandler
): UseRealtimeListingUpdatesResult {
  const [lastEvent, setLastEvent] = useState<RealtimeEvent | null>(null);
  const { subscribe, isConnected } = useRealtimeContext();

  const handler = useCallback(
    (event: RealtimeEvent) => {
      const eventData = (event.data ?? event.payload) as
        | { listingId?: string }
        | undefined;
      const id = eventData?.listingId;
      if (id === listingId) {
        setLastEvent(event);
        onUpdate?.(event);
      }
    },
    [listingId, onUpdate]
  );

  useEffect(() => {
    const unsubscribe = subscribe('listing', handler);
    return unsubscribe;
  }, [subscribe, handler]);

  return { isConnected, lastEvent };
}

// ---------------------------------------------------------------------------
// Provider wrapper (used by both implementations)
// ---------------------------------------------------------------------------

export interface RealtimeContextProviderProps {
  value: RealtimeContextValue;
  children: ReactNode;
}

export function RealtimeContextProvider({
  value,
  children,
}: RealtimeContextProviderProps) {
  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}
