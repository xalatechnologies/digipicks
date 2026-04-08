/**
 * use-notifications Hook Tests
 *
 * Tests for notification hooks: query keys, loading states, data mapping,
 * mark-read mutations, and preference management.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    MOCK_TENANT_ID,
    MOCK_USER_ID,
    mockConvexClient,
} from '../mocks/convex';

vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import {
    notificationKeys,
    useMyNotifications,
    useNotificationUnreadCount,
    useNotificationPreferences,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
    useDeleteNotification,
    useUpdateNotificationPreferences,
} from '@/hooks/use-notifications';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

const mockNotification = {
    _id: 'notif-001',
    _creationTime: Date.now(),
    tenantId: MOCK_TENANT_ID,
    userId: MOCK_USER_ID,
    type: 'booking_confirmed',
    title: 'Booking Confirmed',
    body: 'Your booking has been confirmed.',
    readAt: undefined,
    actionUrl: '/bookings/123',
    metadata: {},
};

describe('notificationKeys', () => {
    it('generates stable query key roots', () => {
        expect(notificationKeys.all).toEqual(['notifications']);
        expect(notificationKeys.unreadCount()).toEqual(['notifications', 'unread-count']);
        expect(notificationKeys.preferences()).toEqual(['notifications', 'preferences']);
        expect(notificationKeys.my()).toContain('notifications');
        expect(notificationKeys.my()).toContain('my');
    });
});

describe('useMyNotifications', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useMyNotifications(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data?.data).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('transforms notifications when loaded', () => {
        vi.mocked(useConvexQuery).mockReturnValue([mockNotification]);

        const { result } = renderHook(
            () => useMyNotifications(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(1);

        const notif = result.current.data!.data[0];
        expect(notif.id).toBe('notif-001');
        expect(notif.title).toBe('Booking Confirmed');
        expect(notif.body).toBe('Your booking has been confirmed.');
        expect(notif.type).toBe('booking_confirmed');
    });

    it('skips query when userId is missing', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useMyNotifications(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(
            expect.anything(),
            'skip'
        );
    });
});

describe('useNotificationUnreadCount', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns 0 when no unread notifications', () => {
        vi.mocked(useConvexQuery).mockReturnValue({ count: 0 });

        const { result } = renderHook(
            () => useNotificationUnreadCount(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        // Returns { data: { count: number }, isLoading, error }
        expect(result.current.data.count).toBe(0);
        expect(result.current.isLoading).toBe(false);
    });

    it('returns count when there are unread notifications', () => {
        vi.mocked(useConvexQuery).mockReturnValue({ count: 5 });

        const { result } = renderHook(
            () => useNotificationUnreadCount(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.data.count).toBe(5);
    });

    it('skips query when userId is undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useNotificationUnreadCount(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useMarkNotificationRead', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useMarkNotificationRead(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
    });
});

describe('useMarkAllNotificationsRead', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useMarkAllNotificationsRead(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useDeleteNotification', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useDeleteNotification(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useNotificationPreferences', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state with default prefs when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useNotificationPreferences(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        // Even when loading, the hook produces default preferences from transformNotificationPreferences([])
        expect(result.current.data).toBeDefined();
        expect(result.current.data.data.email).toBe(true);
        expect(result.current.data.data.push).toBe(true);
        expect(result.current.data.data.inApp).toBe(true);
    });

    it('returns preferences when loaded', () => {
        // Convex returns an array of preference entries, not a preferences object.
        // Each entry has { category, channel, enabled }.
        const mockPrefEntries = [
            { category: 'booking', channel: 'email', enabled: true },
            { category: 'booking', channel: 'push', enabled: false },
            { category: 'booking', channel: 'in_app', enabled: true },
        ];
        vi.mocked(useConvexQuery).mockReturnValue(mockPrefEntries);

        const { result } = renderHook(
            () => useNotificationPreferences(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data?.email).toBe(true);
        expect(result.current.data?.data?.push).toBe(true);
        // Category-specific prefs
        expect(result.current.data?.data?.categories?.booking?.push).toBe(false);
    });
});

describe('useUpdateNotificationPreferences', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useUpdateNotificationPreferences(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});
