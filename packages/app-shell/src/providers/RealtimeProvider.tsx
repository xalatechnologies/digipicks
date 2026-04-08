/**
 * Realtime Provider (WebSocket)
 *
 * Provides WebSocket-based real-time event streaming. Use ConvexRealtimeProvider
 * for production Convex-backed apps — it provides real connection status and
 * no-op event hooks; live data comes from useQuery in SDK hooks.
 *
 * See docs/guide/realtime.md.
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  realtimeClient,
  createTenantWebSocketUrl,
  type RealtimeEvent,
  type RealtimeEventType,
  type RealtimeEventHandler,
} from '@digilist-saas/sdk';
import { env } from '../env';
import { RealtimeContextProvider } from './RealtimeContext';
import type { RealtimeContextValue } from './RealtimeContext';

export interface RealtimeProviderProps {
  children: React.ReactNode;
  /** API base URL (defaults to VITE_API_URL) */
  baseUrl?: string;
  /** Tenant ID for WebSocket connection */
  tenantId?: string;
  /** Auto-connect on mount */
  autoConnect?: boolean;
  /** Enable in development mode (defaults to true) */
  enableInDev?: boolean;
}

export function RealtimeProvider({
  children,
  baseUrl = env.apiUrl,
  tenantId = env.tenantId || 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  autoConnect = true,
  enableInDev = true,
}: RealtimeProviderProps): React.ReactElement {
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const [lastEvents, setLastEvents] = useState<Map<RealtimeEventType, RealtimeEvent>>(new Map());
  const unsubscribesRef = useRef<Array<() => void>>([]);

  // Connect to realtime server
  const connect = useCallback(() => {
    if (!enableInDev && import.meta.env.DEV) {
      return;
    }

    try {
      setStatus('connecting');
      setError(null);

      const wsUrl = createTenantWebSocketUrl(baseUrl, tenantId);

      realtimeClient.connect({
        url: wsUrl,
        autoReconnect: true,
        reconnectInterval: 5000,
        maxReconnectAttempts: 10,
        tenantId,
      });
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to connect');
    }
  }, [baseUrl, tenantId, enableInDev]);

  // Disconnect from realtime server
  const disconnect = useCallback(() => {
    realtimeClient.disconnect();
    setIsConnected(false);
    setStatus('disconnected');
  }, []);

  // Subscribe to event type
  const subscribe = useCallback((eventType: RealtimeEventType | '*', handler: RealtimeEventHandler) => {
    const unsubscribe = realtimeClient.on(eventType, handler);
    unsubscribesRef.current.push(unsubscribe);
    return unsubscribe;
  }, []);

  // Setup connection event handlers
  useEffect(() => {
    // Handle connection events
    const unsubConnected = realtimeClient.on('connected', () => {
      setIsConnected(true);
      setStatus('connected');
      setError(null);
    });

    // Track all events for debugging/display
    const unsubAll = realtimeClient.onAll((event: RealtimeEvent) => {
      if (event.type !== 'pong') {
        setLastEvents(prev => {
          const next = new Map(prev);
          next.set(event.type as RealtimeEventType, event);
          return next;
        });
      }
    });

    unsubscribesRef.current.push(unsubConnected, unsubAll);

    // Auto-connect if enabled
    if (autoConnect) {
      // Small delay to ensure app is ready
      const timer = setTimeout(connect, 500);
      return () => {
        clearTimeout(timer);
        // Cleanup all subscriptions
        unsubscribesRef.current.forEach(unsub => unsub());
        unsubscribesRef.current = [];
      };
    }

    return () => {
      unsubscribesRef.current.forEach(unsub => unsub());
      unsubscribesRef.current = [];
    };
  }, [autoConnect, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const value: RealtimeContextValue = {
    isConnected,
    status,
    error,
    connect,
    disconnect,
    subscribe,
    lastEvents,
  };

  return <RealtimeContextProvider value={value}>{children}</RealtimeContextProvider>;
}

export default RealtimeProvider;
