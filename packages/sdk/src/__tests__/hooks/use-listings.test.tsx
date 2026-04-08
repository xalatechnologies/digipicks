/**
 * use-listings Hook Tests
 *
 * Tests for the listing hooks: query keys, loading states, data mapping,
 * and mutation wiring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    mockResources,
    MOCK_TENANT_ID,
    MOCK_RESOURCE_ID,
    mockConvexClient,
} from '../mocks/convex';

// Mock convex/react before importing hooks
vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock('@/hooks/convex-utils', async () => ({
    useQuery: vi.fn(),
    useMutation: vi.fn(),
    useAction: vi.fn(),
    usePaginatedQuery: vi.fn(),
    useQueries: vi.fn(),
}));

import { useQuery as useCachedQuery, useMutation as useCachedMutation } from '@/hooks/convex-utils';
import {
    useListings,
    useListing,
    usePublicListings,
    useCreateListing,
    useUpdateListing,
    useDeleteListing,
    usePublishListing,
} from '@/hooks/use-listings';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

// useListings expects a raw array from Convex (not paginated),
// then wraps it in toPaginatedResponse internally.
const mockResourceArray = mockResources;

describe('useListings', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useListings({ tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
        expect(result.current.error).toBeNull();
    });

    it('maps Convex resources to Listing shape', () => {
        vi.mocked(useCachedQuery).mockReturnValue(mockResourceArray);

        const { result } = renderHook(
            () => useListings({ tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(2);

        const listing = result.current.data!.data[0];
        expect(listing.id).toBeDefined();
        expect(listing.tenantId).toBeDefined();
        expect(listing.name).toBe('Meeting Room A');
        expect(listing.slug).toBe('meeting-room-a');
        expect(listing.status).toBe('published');
    });

    it('passes status filter to Convex query', () => {
        vi.mocked(useCachedQuery).mockReturnValue(mockResourceArray);

        renderHook(
            () => useListings({ tenantId: MOCK_TENANT_ID, status: 'draft' }),
            { wrapper: createWrapper() }
        );

        expect(useCachedQuery).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ status: 'draft' })
        );
    });

    it('skips query when tenantId is undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        renderHook(
            () => useListings({}),
            { wrapper: createWrapper() }
        );

        expect(useCachedQuery).toHaveBeenCalledWith(
            expect.anything(),
            'skip'
        );
    });
});

describe('useListing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns not-loading when id is undefined (skip mode)', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useListing(undefined),
            { wrapper: createWrapper() }
        );

        // When id is undefined, shouldFetch is false, so isLoading is false (skip mode)
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeUndefined();
    });

    it('returns listing data when loaded', () => {
        vi.mocked(useCachedQuery).mockReturnValue(mockResources[0]);

        const { result } = renderHook(
            () => useListing(MOCK_RESOURCE_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data.name).toBe('Meeting Room A');
    });
});

describe('usePublicListings', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state initially', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => usePublicListings({ tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
    });

    it('returns paginated listings when loaded', () => {
        vi.mocked(useCachedQuery).mockReturnValue(mockResourceArray);

        const { result } = renderHook(
            () => usePublicListings({ tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(2);
    });
});

describe('useCreateListing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('exposes mutate and mutateAsync', () => {
        const mockMutationFn = vi.fn().mockResolvedValue({ id: 'new-id' });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutationFn as never);

        const { result } = renderHook(() => useCreateListing(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
    });
});

describe('useUpdateListing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('exposes mutate with isSuccess false initially', () => {
        const mockMutationFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutationFn as never);

        const { result } = renderHook(() => useUpdateListing(), { wrapper: createWrapper() });

        expect(result.current.isSuccess).toBe(false);
        expect(typeof result.current.mutate).toBe('function');
    });
});

describe('useDeleteListing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('provides delete mutation', () => {
        const mockMutationFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutationFn as never);

        const { result } = renderHook(() => useDeleteListing(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('usePublishListing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('provides publish mutation', () => {
        const mockMutationFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutationFn as never);

        const { result } = renderHook(() => usePublishListing(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});
