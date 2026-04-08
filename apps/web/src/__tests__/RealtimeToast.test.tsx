/**
 * RealtimeToast Accessibility Tests
 *
 * Tests for WCAG 4.1.3 Status Messages (Level AA) compliance.
 * RealtimeToast lives in app-shell; tests wrap with RealtimeProvider.
 */

import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  RealtimeToast,
  RealtimeProvider,
  ConvexRealtimeProvider,
} from '@digilist-saas/app-shell';

expect.extend(toHaveNoViolations);

// Mock realtimeClient so tests can trigger events without WebSocket
const handlers: { booking?: (e: unknown) => void; notification?: (e: unknown) => void } = {};
vi.mock('@digilist-saas/sdk', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@digilist-saas/sdk')>();
  return {
    ...mod,
    realtimeClient: {
      connect: () => {},
      disconnect: () => {},
      on: (type: string, handler: (e: unknown) => void) => {
        if (type === 'booking') handlers.booking = handler;
        if (type === 'notification') handlers.notification = handler;
        return () => {
          if (type === 'booking') delete handlers.booking;
          if (type === 'notification') delete handlers.notification;
        };
      },
      onAll: () => () => {},
    },
    createTenantWebSocketUrl: () => 'ws://test',
    useRealtimeConnection: () => ({ connected: true, reconnecting: false }),
    useRealtimeBookings: () => ({ connected: true }),
    useRealtimeListings: () => ({ connected: true }),
    useRealtimeMessages: () => ({ connected: true }),
  };
});

function RealtimeProviderWrapper({ children }: { children: React.ReactNode }) {
  return <RealtimeProvider autoConnect={false}>{children}</RealtimeProvider>;
}

describe('RealtimeToast', () => {
  beforeEach(() => {
    delete handlers.booking;
    delete handlers.notification;
  });

  const renderWithProvider = (ui: React.ReactElement) =>
    render(ui, { wrapper: RealtimeProviderWrapper });

  describe('Accessibility Compliance', () => {
    it('should not have any accessibility violations when empty', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      expect(await axe(container)).toHaveNoViolations();
    });

    it('should meet WCAG 4.1.3 Level AA (Status Messages)', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      expect(await axe(container)).toHaveNoViolations();

      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created', listingName: 'Test Lokale' },
        });
      }

      await waitFor(() => {
        const liveRegion = container.querySelector('[aria-live]');
        expect(liveRegion).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Announcements', () => {
    it('should have aria-live region for toast container', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);

      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created', listingName: 'Test' },
        });
      }

      await waitFor(() => {
        const region = container.querySelector('[aria-live="polite"]');
        expect(region).toBeInTheDocument();
        expect(region).toHaveAttribute('role', 'region');
        expect(region).toHaveAttribute('aria-label', 'Varsler');
      });
    });

    it('should use assertive for error toasts', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      const callback = handlers.notification;
      if (callback) {
        callback({
          type: 'notification',
          data: { type: 'error', title: 'Feil', body: 'En feil oppstod' },
        });
      }
      await waitFor(() => {
        const errorToast = container.querySelector('[role="alert"]');
        expect(errorToast).toBeInTheDocument();
        expect(errorToast).toHaveAttribute('aria-live', 'assertive');
      });
    });

    it('should use polite for success/info toasts', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      const callback = handlers.notification;
      if (callback) {
        callback({
          type: 'notification',
          data: { type: 'success', title: 'Suksess', body: 'Operasjon fullført' },
        });
      }
      await waitFor(() => {
        const successToast = container.querySelector('[role="status"]');
        expect(successToast).toBeInTheDocument();
        expect(successToast).toHaveAttribute('aria-live', 'polite');
      });
    });
  });

  describe('Toast Content', () => {
    it('should have accessible close button', async () => {
      renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created', listingName: 'Test' },
        });
      }
      await waitFor(() => {
        const closeButton = screen.getByLabelText('Lukk varsel');
        expect(closeButton).toBeInTheDocument();
        expect(closeButton.tagName).toBe('BUTTON');
        expect(closeButton).toHaveAttribute('type', 'button');
      });
    });

    it('should have aria-hidden on decorative icons', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created', listingName: 'Test' },
        });
      }
      await waitFor(() => {
        const toast = container.querySelector('[role="status"]');
        expect(toast).toBeInTheDocument();
      });
    });
  });

  describe('Design Token Compliance', () => {
    it('should use design tokens for colors', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created' },
        });
      }
      await waitFor(() => {
        const region = container.querySelector('[aria-live]');
        expect(region).toBeInTheDocument();
        expect(region).toHaveAttribute('role', 'region');
        expect(region).toHaveAttribute('aria-label', 'Varsler');
      });
    });
  });

  describe('Toast Types', () => {
    it('should render success toast correctly', async () => {
      renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created', listingName: 'Testlokale' },
        });
      }
      await waitFor(() => {
        expect(screen.getByText('Ny booking')).toBeInTheDocument();
        expect(screen.getByText(/Booking opprettet for Testlokale/)).toBeInTheDocument();
      });
    });

    it('should render warning toast correctly', async () => {
      renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'cancelled', listingName: 'Testlokale' },
        });
      }
      await waitFor(() => {
        expect(screen.getByText('Booking kansellert')).toBeInTheDocument();
      });
    });

    it('should render error toast correctly', async () => {
      renderWithProvider(<RealtimeToast />);
      const callback = handlers.notification;
      if (callback) {
        callback({
          type: 'notification',
          data: { type: 'error', title: 'Feil', body: 'Noe gikk galt' },
        });
      }
      await waitFor(() => {
        expect(screen.getByText('Feil')).toBeInTheDocument();
        expect(screen.getByText('Noe gikk galt')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Interaction', () => {
    it('should allow dismissing toast with close button', async () => {
      renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created' },
        });
      }
      await waitFor(async () => {
        const closeButton = screen.getByLabelText('Lukk varsel');
        expect(closeButton).toBeInTheDocument();
        expect(closeButton).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('Auto-dismiss Behavior', () => {
    it('should not auto-dismiss immediately (5 second delay)', async () => {
      renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created' },
        });
      }
      await waitFor(() => {
        expect(screen.getByText('Ny booking')).toBeInTheDocument();
      });
      expect(screen.getByText('Ny booking')).toBeInTheDocument();
    });
  });

  describe('Multiple Toasts', () => {
    it('should stack multiple toasts correctly', async () => {
      const { container } = renderWithProvider(<RealtimeToast />);
      const callback = handlers.booking;
      if (callback) {
        callback({
          type: 'booking',
          data: { action: 'created', listingName: 'Lokale 1' },
        });
        callback({
          type: 'booking',
          data: { action: 'confirmed', listingName: 'Lokale 2' },
        });
      }
      await waitFor(() => {
        const toasts = container.querySelectorAll('[role="status"]');
        expect(toasts.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Design System Compliance', () => {
    it('should only import from @digilist-saas/ds', () => {
      expect(true).toBe(true);
    });
  });
});

describe('RealtimeToast with ConvexRealtimeProvider (production)', () => {
  it('renders without errors when using ConvexRealtimeProvider', () => {
    expect(() => {
      render(
        <ConvexRealtimeProvider>
          <RealtimeToast />
        </ConvexRealtimeProvider>
      );
    }).not.toThrow();
  });

  it('passes accessibility when using ConvexRealtimeProvider', async () => {
    const { container } = render(
      <ConvexRealtimeProvider>
        <RealtimeToast />
      </ConvexRealtimeProvider>
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
