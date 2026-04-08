/**
 * RealtimeContext & ConvexRealtimeProvider Tests
 *
 * Tests shared context, hooks, and ConvexRealtimeProvider integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, renderHook, screen } from '@testing-library/react';
import { ConvexRealtimeProvider } from '../ConvexRealtimeProvider';
import {
  useRealtimeContext,
  useRealtimeStatus,
  useRealtime,
  useRealtimeNotification,
  useRealtimeListingUpdates,
} from '../RealtimeContext';

import { useRealtimeConnection } from '@digilist-saas/sdk';

vi.mock('@digilist-saas/sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@digilist-saas/sdk')>();
  return {
    ...actual,
    useRealtimeConnection: vi.fn(() => ({ connected: true, reconnecting: false })),
    useRealtimeListings: vi.fn(),
  };
});

beforeEach(() => {
  vi.mocked(useRealtimeConnection).mockReturnValue({
    connected: true,
    reconnecting: false,
  });
});

function RealtimeConsumer() {
  const ctx = useRealtimeContext();
  return (
    <div data-testid="context">
      <span data-testid="isConnected">{String(ctx.isConnected)}</span>
      <span data-testid="status">{ctx.status}</span>
    </div>
  );
}

describe('ConvexRealtimeProvider', () => {
  it('renders children', () => {
    const { getByText } = render(
      <ConvexRealtimeProvider>
        <div>Child content</div>
      </ConvexRealtimeProvider>
    );
    expect(getByText('Child content')).toBeInTheDocument();
  });

  it('provides realtime context with isConnected from useRealtimeConnection', () => {
    render(
      <ConvexRealtimeProvider>
        <RealtimeConsumer />
      </ConvexRealtimeProvider>
    );

    expect(screen.getByTestId('isConnected')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('connected');
  });

  it('provides reconnecting status when connection state is reconnecting', () => {
    vi.mocked(useRealtimeConnection).mockReturnValue({
      connected: false,
      reconnecting: true,
    });

    render(
      <ConvexRealtimeProvider>
        <RealtimeConsumer />
      </ConvexRealtimeProvider>
    );

    expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
    expect(screen.getByTestId('status')).toHaveTextContent('connecting');
  });
});

describe('useRealtimeStatus', () => {
  it('returns isConnected, status, error from context', () => {
    const { result } = renderHook(() => useRealtimeStatus(), {
      wrapper: ({ children }) => (
        <ConvexRealtimeProvider>{children}</ConvexRealtimeProvider>
      ),
    });

    expect(result.current.isConnected).toBe(true);
    expect(result.current.status).toBe('connected');
    expect(result.current.error).toBeNull();
  });
});

describe('useRealtime (alias)', () => {
  it('returns same shape as useRealtimeStatus', () => {
    const { result } = renderHook(() => useRealtime(), {
      wrapper: ({ children }) => (
        <ConvexRealtimeProvider>{children}</ConvexRealtimeProvider>
      ),
    });

    expect(result.current).toMatchObject({
      isConnected: true,
      status: 'connected',
      error: null,
    });
  });
});

describe('useRealtimeContext', () => {
  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => {
      renderHook(() => useRealtimeContext());
    }).toThrow(
      'useRealtimeContext must be used within RealtimeProvider or ConvexRealtimeProvider'
    );
    consoleSpy.mockRestore();
  });

  it('returns full context when inside provider', () => {
    const { result } = renderHook(() => useRealtimeContext(), {
      wrapper: ({ children }) => (
        <ConvexRealtimeProvider>{children}</ConvexRealtimeProvider>
      ),
    });

    expect(result.current).toMatchObject({
      isConnected: true,
      status: 'connected',
      error: null,
    });
    expect(typeof result.current.connect).toBe('function');
    expect(typeof result.current.disconnect).toBe('function');
    expect(typeof result.current.subscribe).toBe('function');
    expect(result.current.lastEvents).toBeInstanceOf(Map);
  });
});

describe('useRealtimeNotification', () => {
  it('does not throw when used with ConvexRealtimeProvider', () => {
    const handler = vi.fn();
    expect(() => {
      renderHook(() => useRealtimeNotification(handler), {
        wrapper: ({ children }) => (
          <ConvexRealtimeProvider>{children}</ConvexRealtimeProvider>
        ),
      });
    }).not.toThrow();
  });
});

describe('useRealtimeListingUpdates', () => {
  it('returns isConnected and lastEvent', () => {
    const { result } = renderHook(
      () => useRealtimeListingUpdates('listing-1', vi.fn()),
      {
        wrapper: ({ children }) => (
          <ConvexRealtimeProvider>{children}</ConvexRealtimeProvider>
        ),
      }
    );

    expect(result.current.isConnected).toBe(true);
    expect(result.current.lastEvent).toBeNull();
  });
});
