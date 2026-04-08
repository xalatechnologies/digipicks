/**
 * use-pricing Hook Tests
 *
 * Tests for pricing hooks: query keys, resource pricing, pricing groups,
 * discount codes, weekday pricing, and mutation hooks.
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
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn(), useAction: vi.fn() };
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
    useResourcePricing,
    usePricingGroups,
    useDiscountCodes,
    useValidateDiscountCode,
    useCreateResourcePricing,
    useUpdateResourcePricing,
    useCreatePricingGroup,
    useCreateDiscountCode,
    useApplyDiscountCode,
} from '@/hooks/use-pricing';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

const mockResourcePricing = {
    priceType: 'per_hour',
    currency: 'NOK',
    pricePerHour: 500,
    basePrice: 500,
    constraints: { minDurationMinutes: 60, maxDurationMinutes: 480 },
};

const mockPricingGroup = {
    _id: 'pg-001',
    _creationTime: Date.now(),
    tenantId: MOCK_TENANT_ID,
    name: 'Standard',
    description: 'Standard pricing',
    isDefault: true,
    priority: 0,
    isActive: true,
};

const mockDiscountCode = {
    _id: 'dc-001',
    _creationTime: Date.now(),
    tenantId: MOCK_TENANT_ID,
    code: 'VELKOMST10',
    name: 'Velkomst 10%',
    discountType: 'percent',
    discountValue: 10,
    currentUses: 5,
    isActive: true,
};

describe('useResourcePricing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useResourcePricing(MOCK_RESOURCE_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
        expect(result.current.error).toBeNull();
    });

    it('returns pricing config when loaded', () => {
        vi.mocked(useCachedQuery).mockReturnValue(mockResourcePricing);

        const { result } = renderHook(
            () => useResourcePricing(MOCK_RESOURCE_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeDefined();
    });

    it('skips query when resourceId is undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        renderHook(
            () => useResourcePricing(undefined),
            { wrapper: createWrapper() }
        );

        expect(useCachedQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('usePricingGroups', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => usePricingGroups(MOCK_TENANT_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
    });

    it('returns pricing groups when loaded', () => {
        vi.mocked(useCachedQuery).mockReturnValue([mockPricingGroup]);

        const { result } = renderHook(
            () => usePricingGroups(MOCK_TENANT_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data![0].name).toBe('Standard');
        expect(result.current.data![0].isDefault).toBe(true);
    });

    it('skips query when tenantId is undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        renderHook(
            () => usePricingGroups(undefined),
            { wrapper: createWrapper() }
        );

        expect(useCachedQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useDiscountCodes', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useDiscountCodes(MOCK_TENANT_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeUndefined();
    });

    it('returns discount codes when loaded', () => {
        vi.mocked(useCachedQuery).mockReturnValue([mockDiscountCode]);

        const { result } = renderHook(
            () => useDiscountCodes(MOCK_TENANT_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toHaveLength(1);
        expect(result.current.data![0].code).toBe('VELKOMST10');
        expect(result.current.data![0].discountValue).toBe(10);
    });
});

describe('useValidateDiscountCode', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('skips query when code is undefined', () => {
        vi.mocked(useCachedQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useValidateDiscountCode(MOCK_TENANT_ID, undefined),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeUndefined();
    });

    it('returns validation result when code is provided', () => {
        vi.mocked(useCachedQuery).mockReturnValue({
            valid: true,
            error: null,
            code: { id: 'dc-001', code: 'VELKOMST10', name: 'Velkomst 10%', discountType: 'percent', discountValue: 10 },
        });

        const { result } = renderHook(
            () => useValidateDiscountCode(MOCK_TENANT_ID, 'VELKOMST10'),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.valid).toBe(true);
    });
});

describe('useCreateResourcePricing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns createPricing function', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'rp-new' });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreateResourcePricing(), { wrapper: createWrapper() });

        expect(typeof result.current.createPricing).toBe('function');
    });
});

describe('useUpdateResourcePricing', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns updatePricing function', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useUpdateResourcePricing(), { wrapper: createWrapper() });

        expect(typeof result.current.updatePricing).toBe('function');
    });
});

describe('useCreatePricingGroup', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns createGroup function', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'pg-new' });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreatePricingGroup(), { wrapper: createWrapper() });

        expect(typeof result.current.createGroup).toBe('function');
    });
});

describe('useCreateDiscountCode', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns createDiscountCode function', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'dc-new' });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreateDiscountCode(), { wrapper: createWrapper() });

        expect(typeof result.current.createDiscountCode).toBe('function');
    });
});

describe('useApplyDiscountCode', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns applyDiscountCode function', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true, discountAmount: 100 });
        vi.mocked(useCachedMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useApplyDiscountCode(), { wrapper: createWrapper() });

        expect(typeof result.current.applyDiscountCode).toBe('function');
    });
});
