/**
 * RealtimeProviderInterface — Minimal contract for realtime providers
 *
 * RealtimeProvider (WebSocket) and ConvexRealtimeProvider (Convex) both implement this.
 * Apps use useRealtime() or useRealtimeStatus() — no need to know which provider is mounted.
 */

export interface RealtimeProviderInterface {
  /** Whether connected to the realtime backend */
  isConnected: boolean;
}

/** Minimal realtime status for UI (connection indicator, toasts, etc.) */
export interface RealtimeStatus {
  isConnected: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  error: string | null;
}
