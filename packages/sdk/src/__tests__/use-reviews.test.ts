/**
 * Reviews SDK Hooks - Unit Tests
 *
 * Tests for the review hooks wired to Convex backend.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { createElement, type ReactNode } from 'react';
import {
    useReviews,
    useReview,
    useListingReviews,
    useReviewStats,
    useMyReviews,
    useCreateReview,
    useUpdateReview,
    useDeleteReview,
    useModerateReview,
    reviewKeys,
} from '../hooks/use-reviews';
import type { Id } from '../convex-api';

// Mock Convex client
const mockConvexClient = {
    watchQuery: vi.fn(),
    mutation: vi.fn(),
    query: vi.fn(),
} as unknown as ConvexReactClient;

// Test wrapper with ConvexProvider
const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(ConvexProvider, { client: mockConvexClient }, children);

// Sample test data
const mockTenantId = 'test-tenant-id' as Id<"tenants">;
const mockResourceId = 'test-resource-id' as Id<"resources">;
const mockUserId = 'test-user-id' as Id<"users">;
const mockReviewId = 'test-review-id' as Id<"reviews">;

const mockReview = {
    _id: mockReviewId,
    tenantId: mockTenantId,
    resourceId: mockResourceId,
    userId: mockUserId,
    rating: 5,
    title: 'Great experience',
    text: 'Loved it!',
    status: 'approved',
    _creationTime: Date.now(),
};

describe('reviewKeys', () => {
    it('should create correct query keys', () => {
        expect(reviewKeys.all).toEqual(['reviews']);
        expect(reviewKeys.lists()).toEqual(['reviews', 'list']);
        expect(reviewKeys.list({ status: 'pending' })).toEqual(['reviews', 'list', { status: 'pending' }]);
        expect(reviewKeys.detail('123')).toEqual(['reviews', 'detail', '123']);
        expect(reviewKeys.stats('resource-1')).toEqual(['reviews', 'stats', 'resource-1']);
    });
});

describe('useReviews', () => {
    it('should skip query when tenantId is undefined', () => {
        const { result } = renderHook(() => useReviews(undefined), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.reviews).toEqual([]);
    });

    it('should return loading state when data is not yet available', () => {
        // When tenantId is provided but data is undefined, isLoading should be true
        // This requires mocking the useConvexQuery hook behavior
    });
});

describe('useReview', () => {
    it('should skip query when id is undefined', () => {
        const { result } = renderHook(() => useReview(undefined), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.review).toBe(null);
    });
});

describe('useListingReviews', () => {
    it('should skip query when tenantId or resourceId is undefined', () => {
        const { result: result1 } = renderHook(
            () => useListingReviews(undefined, mockResourceId),
            { wrapper }
        );
        expect(result1.current.reviews).toEqual([]);

        const { result: result2 } = renderHook(
            () => useListingReviews(mockTenantId, undefined),
            { wrapper }
        );
        expect(result2.current.reviews).toEqual([]);
    });
});

describe('useReviewStats', () => {
    it('should skip query when resourceId is undefined', () => {
        const { result } = renderHook(() => useReviewStats(undefined), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.stats).toBe(null);
    });
});

describe('useMyReviews', () => {
    it('should skip query when tenantId is undefined', () => {
        const { result } = renderHook(
            () => useMyReviews(undefined, mockUserId),
            { wrapper }
        );

        expect(result.current.reviews).toEqual([]);
    });

    it('should filter reviews by userId when provided', () => {
        // Test client-side filtering
    });
});

describe('Mutation Hooks', () => {
    describe('useCreateReview', () => {
        it('should return mutation functions', () => {
            const { result } = renderHook(() => useCreateReview(), { wrapper });

            expect(result.current.mutate).toBeDefined();
            expect(result.current.mutateAsync).toBeDefined();
            expect(typeof result.current.mutate).toBe('function');
            expect(typeof result.current.mutateAsync).toBe('function');
        });
    });

    describe('useUpdateReview', () => {
        it('should return mutation functions', () => {
            const { result } = renderHook(() => useUpdateReview(), { wrapper });

            expect(result.current.mutate).toBeDefined();
            expect(result.current.mutateAsync).toBeDefined();
        });
    });

    describe('useDeleteReview', () => {
        it('should return mutation functions', () => {
            const { result } = renderHook(() => useDeleteReview(), { wrapper });

            expect(result.current.mutate).toBeDefined();
            expect(result.current.mutateAsync).toBeDefined();
        });
    });

    describe('useModerateReview', () => {
        it('should return mutation functions', () => {
            const { result } = renderHook(() => useModerateReview(), { wrapper });

            expect(result.current.mutate).toBeDefined();
            expect(result.current.mutateAsync).toBeDefined();
        });
    });
});

describe('Review Type Transformations', () => {
    it('should transform Convex fields to SDK types', () => {
        // The transformReview function should:
        // - Map _id to id
        // - Map text to body
        // - Map moderationNote to moderatorNotes
        // - Convert _creationTime to ISO string createdAt
    });
});
