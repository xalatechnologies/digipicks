/**
 * use-addons Hook Tests
 *
 * Tests for addon hooks: listing, single addon, resource addons,
 * booking addons, and CRUD mutations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    MOCK_TENANT_ID,
    MOCK_RESOURCE_ID,
    mockConvexClient,
} from '../mocks/convex';

vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import {
    useAddons,
    useAddon,
    useAddonsForResource,
    useCreateAddon,
    useUpdateAddon,
    useDeleteAddon,
    useAddAddonToResource,
} from '@/hooks/use-addons';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

const mockAddon = {
    _id: 'addon-001',
    _creationTime: Date.now(),
    tenantId: MOCK_TENANT_ID,
    name: 'Projektor',
    slug: 'projektor',
    description: 'Profesjonell projektor',
    category: 'equipment',
    priceType: 'FLAT',
    price: 200,
    currency: 'NOK',
    requiresApproval: false,
    images: [],
    displayOrder: 1,
    isActive: true,
    metadata: {},
};

const mockResourceAddon = {
    _id: 'ra-001',
    _creationTime: Date.now(),
    tenantId: MOCK_TENANT_ID,
    resourceId: MOCK_RESOURCE_ID,
    addonId: 'addon-001',
    isRequired: false,
    isRecommended: true,
    displayOrder: 1,
    isActive: true,
    addon: mockAddon,
    effectivePrice: 200,
};

describe('useAddons', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useAddons(MOCK_TENANT_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data?.data).toEqual([]);
        expect(result.current.error).toBeNull();
    });

    it('returns addon list when loaded', () => {
        vi.mocked(useConvexQuery).mockReturnValue([mockAddon]);

        const { result } = renderHook(
            () => useAddons(MOCK_TENANT_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data!.data[0]._id).toBe('addon-001');
        expect(result.current.data!.data[0].name).toBe('Projektor');
    });

    it('skips query when tenantId is undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useAddons(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });

    it('passes category filter', () => {
        vi.mocked(useConvexQuery).mockReturnValue([mockAddon]);

        renderHook(
            () => useAddons(MOCK_TENANT_ID, { category: 'equipment' }),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ category: 'equipment' })
        );
    });
});

describe('useAddon', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns not-loading when addonId is undefined (guard: id !== undefined && data === undefined)', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useAddon(undefined),
            { wrapper: createWrapper() }
        );

        // isLoading is false when addonId is undefined (the guard condition)
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeUndefined();
    });

    it('returns addon when loaded', () => {
        vi.mocked(useConvexQuery).mockReturnValue(mockAddon);

        const { result } = renderHook(
            () => useAddon('addon-001'),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?._id).toBe('addon-001');
        expect(result.current.data?.name).toBe('Projektor');
    });
});

describe('useAddonsForResource', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns not-loading when resourceId is undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useAddonsForResource(undefined),
            { wrapper: createWrapper() }
        );

        // isLoading is false when resourceId is undefined (guard condition)
        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toEqual([]);
    });

    it('returns resource addons when loaded', () => {
        vi.mocked(useConvexQuery).mockReturnValue([mockResourceAddon]);

        const { result } = renderHook(
            () => useAddonsForResource(MOCK_RESOURCE_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(1);
        expect(result.current.data!.data[0].addonId).toBe('addon-001');
    });
});

describe('useCreateAddon', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'addon-new' });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreateAddon(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
    });
});

describe('useUpdateAddon', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useUpdateAddon(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useDeleteAddon', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useDeleteAddon(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useAddAddonToResource', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'ra-new' });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useAddAddonToResource(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

