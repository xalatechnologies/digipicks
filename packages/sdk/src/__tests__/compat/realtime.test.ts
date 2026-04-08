/**
 * SDK Realtime Compat Layer Tests
 *
 * Tests for useRealtimeConnection (real Convex status), no-op hooks, and types.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
  useRealtimeConnection,
  useRealtimeBookings,
  useRealtimeListings,
  useRealtimeCalendar,
  realtimeClient,
  createTenantWebSocketUrl,
  type RealtimeConnectionState,
  type RealtimeSubscriptionState,
} from '../../compat/realtime';
import { mockConvexClient } from '../mocks/convex';

// Mock useConvexConnectionState
const mockConnectionState = {
  isWebSocketConnected: true,
  hasEverConnected: true,
  connectionCount: 1,
  connectionRetries: 0,
  inflightMutations: 0,
  inflightActions: 0,
};
vi.mock('convex/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('convex/react')>();
  return {
    ...actual,
    useConvexConnectionState: vi.fn(() => mockConnectionState),
  };
});

import { useConvexConnectionState } from 'convex/react';

const createWrapper = () =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(ConvexProvider, {
      client: mockConvexClient as never,
      children,
    });

describe('useRealtimeConnection', () => {
  beforeEach(() => {
    vi.mocked(useConvexConnectionState).mockReturnValue({
      ...mockConnectionState,
      isWebSocketConnected: true,
      hasEverConnected: true,
    } as never);
  });

  it('returns connected when WebSocket is connected', () => {
    vi.mocked(useConvexConnectionState).mockReturnValue({
      ...mockConnectionState,
      isWebSocketConnected: true,
      hasEverConnected: true,
    } as never);

    const { result } = renderHook(() => useRealtimeConnection(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual<RealtimeConnectionState>({
      connected: true,
      reconnecting: false,
    });
  });

  it('returns reconnecting when WebSocket disconnected but had connected before', () => {
    vi.mocked(useConvexConnectionState).mockReturnValue({
      ...mockConnectionState,
      isWebSocketConnected: false,
      hasEverConnected: true,
    } as never);

    const { result } = renderHook(() => useRealtimeConnection(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual<RealtimeConnectionState>({
      connected: false,
      reconnecting: true,
    });
  });

  it('returns disconnected when never connected', () => {
    vi.mocked(useConvexConnectionState).mockReturnValue({
      ...mockConnectionState,
      isWebSocketConnected: false,
      hasEverConnected: false,
    } as never);

    const { result } = renderHook(() => useRealtimeConnection(), {
      wrapper: createWrapper(),
    });

    expect(result.current).toEqual<RealtimeConnectionState>({
      connected: false,
      reconnecting: false,
    });
  });
});

describe('no-op subscription hooks', () => {
  it('useRealtimeBookings returns connected', () => {
    const { result } = renderHook(() => useRealtimeBookings(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toEqual<RealtimeSubscriptionState>({ connected: true });
  });

  it('useRealtimeListings returns connected', () => {
    const { result } = renderHook(() => useRealtimeListings(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toEqual<RealtimeSubscriptionState>({ connected: true });
  });

  it('useRealtimeCalendar returns connected', () => {
    const { result } = renderHook(() => useRealtimeCalendar(), {
      wrapper: createWrapper(),
    });
    expect(result.current).toEqual<RealtimeSubscriptionState>({ connected: true });
  });
});

describe('realtimeClient (imperative shim)', () => {
  it('has isConnected property', () => {
    expect(realtimeClient).toHaveProperty('isConnected');
  });

  it('connect is no-op', () => {
    expect(() => realtimeClient.connect()).not.toThrow();
  });

  it('disconnect is no-op', () => {
    expect(() => realtimeClient.disconnect()).not.toThrow();
  });

  it('on returns unsubscribe function', () => {
    const unsub = realtimeClient.on('booking', () => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });

  it('createTenantWebSocketUrl returns empty string', () => {
    expect(createTenantWebSocketUrl()).toBe('');
    expect(createTenantWebSocketUrl('https://api.test', 'tenant-1')).toBe('');
  });
});
