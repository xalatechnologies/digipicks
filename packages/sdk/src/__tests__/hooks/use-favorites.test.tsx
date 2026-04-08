/**
 * use-favorites Hook Tests
 *
 * Tests for the favorites hook: guest (localStorage) mode,
 * logged-in (Convex) mode, toggle behavior, and sync.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    MOCK_TENANT_ID,
    MOCK_USER_ID,
    MOCK_RESOURCE_ID,
    mockConvexClient,
} from '../mocks/convex';
import { localStorageMock } from '../setup';

vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import { useFavorites, useFavoriteIds } from '@/hooks/use-favorites';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

describe('useFavorites — guest mode (no userId)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        vi.mocked(useConvexQuery).mockReturnValue(undefined);
        vi.mocked(useConvexMutation).mockReturnValue(vi.fn() as never);
    });

    it('starts with empty favorites', () => {
        const { result } = renderHook(
            () => useFavorites({}),
            { wrapper: createWrapper() }
        );

        expect(result.current.favoriteIds).toEqual([]);
        expect(result.current.count).toBe(0);
        expect(result.current.isLoggedIn).toBe(false);
    });

    it('isFavorite returns false for non-favorited resource', () => {
        const { result } = renderHook(
            () => useFavorites({}),
            { wrapper: createWrapper() }
        );

        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(false);
    });

    it('adds and removes favorites in localStorage', async () => {
        const { result } = renderHook(
            () => useFavorites({}),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            await result.current.addFavorite(MOCK_RESOURCE_ID);
        });

        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(true);
        expect(result.current.count).toBe(1);

        await act(async () => {
            await result.current.removeFavorite(MOCK_RESOURCE_ID);
        });

        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(false);
        expect(result.current.count).toBe(0);
    });

    it('toggleFavorite adds when not favorited', async () => {
        const { result } = renderHook(
            () => useFavorites({}),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            await result.current.toggleFavorite(MOCK_RESOURCE_ID);
        });

        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(true);
    });

    it('toggleFavorite removes when already favorited', async () => {
        const { result } = renderHook(
            () => useFavorites({}),
            { wrapper: createWrapper() }
        );

        // Add first
        await act(async () => {
            await result.current.addFavorite(MOCK_RESOURCE_ID);
        });
        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(true);

        // Toggle off
        await act(async () => {
            await result.current.toggleFavorite(MOCK_RESOURCE_ID);
        });
        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(false);
    });

    it('clearLocalFavorites empties the list', async () => {
        const { result } = renderHook(
            () => useFavorites({}),
            { wrapper: createWrapper() }
        );

        await act(async () => {
            await result.current.addFavorite(MOCK_RESOURCE_ID);
        });
        expect(result.current.count).toBe(1);

        act(() => {
            result.current.clearLocalFavorites();
        });
        expect(result.current.count).toBe(0);
    });
});

describe('useFavorites — logged-in mode (with userId)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
    });

    it('sets isLoggedIn to true', () => {
        const mockDbFavorites = [
            { resourceId: MOCK_RESOURCE_ID, addedAt: Date.now() }
        ];
        vi.mocked(useConvexQuery).mockReturnValue(mockDbFavorites);
        vi.mocked(useConvexMutation).mockReturnValue(vi.fn() as never);

        const { result } = renderHook(
            () => useFavorites({ userId: MOCK_USER_ID, tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoggedIn).toBe(true);
    });

    it('reads favorites from database when logged in', () => {
        const mockDbFavorites = [
            { resourceId: MOCK_RESOURCE_ID, addedAt: Date.now() }
        ];
        vi.mocked(useConvexQuery).mockReturnValue(mockDbFavorites);
        vi.mocked(useConvexMutation).mockReturnValue(vi.fn() as never);

        const { result } = renderHook(
            () => useFavorites({ userId: MOCK_USER_ID, tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(true);
        expect(result.current.count).toBe(1);
    });
});

describe('useFavoriteIds', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorageMock.clear();
        vi.mocked(useConvexQuery).mockReturnValue(undefined);
        vi.mocked(useConvexMutation).mockReturnValue(vi.fn() as never);
    });

    it('returns empty array initially', () => {
        const { result } = renderHook(
            () => useFavoriteIds({}),
            { wrapper: createWrapper() }
        );

        expect(result.current.favoriteIds).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('returns isFavorite helper function', () => {
        const { result } = renderHook(
            () => useFavoriteIds({}),
            { wrapper: createWrapper() }
        );

        expect(typeof result.current.isFavorite).toBe('function');
        expect(result.current.isFavorite(MOCK_RESOURCE_ID)).toBe(false);
    });
});
