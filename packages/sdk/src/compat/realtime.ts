/**
 * Compatibility shim for @digilist/client-sdk realtime hooks.
 *
 * Convex queries are reactive by default — no separate WebSocket needed.
 * useRealtimeConnection returns real Convex WebSocket status (production-ready).
 * Other hooks are no-ops; live data comes from useQuery in SDK hooks.
 *
 * Types: canonical RealtimeEvent, RealtimeEventType from @digipicks/shared/types.
 */

import { useConvexConnectionState } from 'convex/react';
import type { RealtimeEventHandler } from '@digipicks/shared/types';

// ---------------------------------------------------------------------------
// Types (re-export from shared — single source of truth)
// ---------------------------------------------------------------------------

export type { RealtimeEvent, RealtimeEventHandler, RealtimeEventType } from '@digipicks/shared/types';

export interface RealtimeConnectionState {
  connected: boolean;
  reconnecting: boolean;
}

export interface RealtimeSubscriptionState {
  connected: boolean;
}

type AnyCallback = (...args: unknown[]) => void;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Returns real Convex WebSocket connection status.
 * Must be used inside ConvexProvider. Rerenders on connection changes.
 */
export function useRealtimeConnection(): RealtimeConnectionState {
  const state = useConvexConnectionState();
  return {
    connected: state.isWebSocketConnected,
    reconnecting: !state.isWebSocketConnected && state.hasEverConnected,
  };
}

/** No-op: Convex bookings queries are already reactive. */
export function useRealtimeBookings(_callback?: AnyCallback): RealtimeSubscriptionState {
  return { connected: true };
}

/** No-op: Convex listing queries are already reactive. */
export function useRealtimeListings(_callback?: AnyCallback): RealtimeSubscriptionState {
  return { connected: true };
}

/** No-op: Convex calendar queries are already reactive. */
export function useRealtimeCalendar(_callback?: AnyCallback): RealtimeSubscriptionState {
  return { connected: true };
}

// ---------------------------------------------------------------------------
// Realtime client object (imperative API shim)
// ---------------------------------------------------------------------------

export const realtimeClient = {
  /** Static property — Convex is always "connected". */
  isConnected: true as boolean,

  /** No-op: Convex manages its own connection. */
  connect: (_opts?: Record<string, unknown> | string) => {},

  /** No-op: Convex manages its own connection. */
  disconnect: () => {},

  /** No-op event listener registration. Returns unsubscribe function. */
  on: (_event: string, _callback: RealtimeEventHandler | AnyCallback): (() => void) => {
    return () => {};
  },

  /** No-op event listener removal. */
  off: (_event: string, _callback: RealtimeEventHandler | AnyCallback): void => {},

  /** No-op listing subscription. Returns unsubscribe function. */
  onListing: (
    _idOrCallback: string | RealtimeEventHandler | AnyCallback,
    _callback?: RealtimeEventHandler | AnyCallback,
  ): (() => void) => {
    return () => {};
  },

  /** No-op: subscribe to all events. Returns unsubscribe function. */
  onAll: (_callback: RealtimeEventHandler | AnyCallback): (() => void) => {
    return () => {};
  },

  /** No-op: emit an event (used in test utilities). */
  emit: (_event: string, ..._args: unknown[]): void => {},
};

// ---------------------------------------------------------------------------
// URL factories (stubs — used by legacy RealtimeProvider in app-shell)
// ---------------------------------------------------------------------------

/**
 * Returns an empty string. The digdir SDK used this to build tenant-scoped
 * WebSocket URLs; Convex handles real-time at the query level.
 */
export function createTenantWebSocketUrl(_baseUrlOrTenantId?: string, _tenantId?: string): string {
  return '';
}
