/**
 * use-billing Hook Tests
 *
 * Tests for billing hooks: query keys, summary loading, invoice listing,
 * pending payment counts, and payment/invoice mutations.
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
    billingKeys,
    useBillingSummary,
    useInvoices,
    usePendingPaymentsCount,
    useCreatePayment,
    useUpdatePaymentStatus,
    useCreateInvoice,
    useMarkInvoicePaid,
} from '@/hooks/use-billing';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

const mockBillingSummaryRaw = {
    totalSpent: 1500,
    pendingAmount: 300,
    currency: 'NOK',
    bookingCount: 5,
    period: '2026-02',
};

const mockInvoicesRaw = [
    {
        id: 'inv-001',
        _creationTime: Date.now(),
        tenantId: MOCK_TENANT_ID,
        userId: MOCK_USER_ID,
        reference: 'INV-001',
        amount: 500,
        currency: 'NOK',
        status: 'paid',
        description: 'Booking for Festsalen',
        createdAt: new Date().toISOString(),
        bookingId: 'k17book789',
        resourceName: 'Festsalen',
    },
];

describe('billingKeys', () => {
    it('generates stable query key roots', () => {
        expect(billingKeys.all).toEqual(['billing']);
        expect(billingKeys.pending()).toContain('billing');
        expect(billingKeys.pending()).toContain('pending');
        expect(billingKeys.invoices()).toContain('billing');
        expect(billingKeys.summary()).toContain('billing');
    });
});

describe('useBillingSummary', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useBillingSummary(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('returns billing summary when loaded', () => {
        vi.mocked(useConvexQuery).mockReturnValue(mockBillingSummaryRaw);

        const { result } = renderHook(
            () => useBillingSummary(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        const summary = result.current.data!.data;
        expect(summary.totalSpent).toBe(1500);
        expect(summary.currency).toBe('NOK');
        expect(summary.bookingCount).toBe(5);
    });

    it('skips query when userId is missing', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useBillingSummary(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useInvoices', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useInvoices(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data?.data).toEqual([]);
    });

    it('maps invoices to Invoice shape', () => {
        vi.mocked(useConvexQuery).mockReturnValue(mockInvoicesRaw);

        const { result } = renderHook(
            () => useInvoices(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data?.data).toHaveLength(1);

        const invoice = result.current.data!.data[0];
        expect(invoice.id).toBe('inv-001');
        expect(invoice.amount).toBe(500);
        expect(invoice.currency).toBe('NOK');
        expect(invoice.status).toBe('paid');
    });
});

describe('usePendingPaymentsCount', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns count 0 wrapped in data.data when no pending payments', () => {
        vi.mocked(useConvexQuery).mockReturnValue({ count: 0 });

        const { result } = renderHook(
            () => usePendingPaymentsCount(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        // Returns { data: { data: { count: number } }, isLoading, error }
        expect(result.current.data.data.count).toBe(0);
        expect(result.current.isLoading).toBe(false);
    });

    it('returns count wrapped in data.data when there are pending payments', () => {
        vi.mocked(useConvexQuery).mockReturnValue({ count: 3 });

        const { result } = renderHook(
            () => usePendingPaymentsCount(MOCK_USER_ID),
            { wrapper: createWrapper() }
        );

        expect(result.current.data.data.count).toBe(3);
    });

    it('skips query when userId is undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => usePendingPaymentsCount(undefined),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useCreatePayment', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'payment-001' });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreatePayment(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
        expect(result.current.error).toBeNull();
    });
});

describe('useUpdatePaymentStatus', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useUpdatePaymentStatus(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useCreateInvoice', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ id: 'inv-new' });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useCreateInvoice(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useMarkInvoicePaid', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const mockMutFn = vi.fn().mockResolvedValue({ success: true });
        vi.mocked(useConvexMutation).mockReturnValue(mockMutFn as never);

        const { result } = renderHook(() => useMarkInvoicePaid(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});
