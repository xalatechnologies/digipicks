/**
 * ConvexRealtimeProvider — Production realtime via Convex SDK.
 *
 * Provides real connection status from useConvexConnectionState (WebSocket).
 * Maintains a live subscriber registry so realtime hooks (useRealtimeListing,
 * useRealtimeMessage, etc.) can receive dispatched events. Convex queries are
 * reactive for data freshness; this provider adds event-driven side effects
 * (toasts, badges, sounds) on top.
 */

import { useMemo, useRef, useCallback } from 'react';
import {
  useRealtimeConnection,
  useRealtimeListings,
} from '@digilist-saas/sdk';
import type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeEventHandler,
} from '@digilist-saas/shared/types';
import {
  RealtimeContextProvider,
  useRealtimeContext,
  type RealtimeContextValue,
} from './RealtimeContext';

export interface ConvexRealtimeProviderProps {
  children: React.ReactNode;
  wsUrl?: string;
  tenantId?: string;
}

export function ConvexRealtimeProvider({ children }: ConvexRealtimeProviderProps) {
  const connectionState = useRealtimeConnection();
  useRealtimeListings();

  // Live subscriber registry — handlers registered via useRealtimeListing() etc.
  const subscribersRef = useRef<Map<string, Set<RealtimeEventHandler>>>(new Map());
  const lastEventsRef = useRef<Map<RealtimeEventType, RealtimeEvent>>(new Map());

  const subscribe = useCallback(
    (eventType: RealtimeEventType | '*', handler: RealtimeEventHandler): (() => void) => {
      const key = eventType;
      if (!subscribersRef.current.has(key)) {
        subscribersRef.current.set(key, new Set());
      }
      subscribersRef.current.get(key)!.add(handler);

      return () => {
        const set = subscribersRef.current.get(key);
        if (set) {
          set.delete(handler);
          if (set.size === 0) subscribersRef.current.delete(key);
        }
      };
    },
    []
  );

  const value: RealtimeContextValue = useMemo(
    () => ({
      isConnected: connectionState.connected,
      status: connectionState.connected
        ? 'connected'
        : connectionState.reconnecting
          ? 'connecting'
          : 'disconnected',
      error: null,
      connect: () => {},
      disconnect: () => {},
      subscribe,
      lastEvents: lastEventsRef.current,
    }),
    [connectionState.connected, connectionState.reconnecting, subscribe]
  );

  return <RealtimeContextProvider value={value}>{children}</RealtimeContextProvider>;
}

/** Use useRealtimeStatus for full status; this returns isConnected for backwards compat */
export function useConvexRealtimeStatus(): { isConnected: boolean } {
  const { isConnected } = useRealtimeContext();
  return { isConnected };
}

