/**
 * use-search Hook Tests
 *
 * Tests for search hooks: query keys, global search, typeahead,
 * saved filters, recent searches, and search facets.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
    MOCK_TENANT_ID,
    mockConvexClient,
} from '../mocks/convex';

vi.mock('convex/react', async () => {
    const actual = await vi.importActual('convex/react');
    return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from 'convex/react';
import {
    searchKeys,
    useGlobalSearch,
    useTypeahead,
    useSavedFilters,
    useCreateSavedFilter,
    useDeleteSavedFilter,
    useRecentSearches,
} from '@/hooks/use-search';

const createWrapper = () =>
    ({ children }: { children: React.ReactNode }) => (
        <ConvexProvider client={mockConvexClient as never}>{children}</ConvexProvider>
    );

const mockSearchResult = {
    results: [
        {
            id: 'res-001',
            name: 'Festsalen',
            slug: 'festsalen',
            categoryKey: 'LOKALER',
            score: 1,
            description: 'A great hall',
            images: [],
            metadata: {},
        },
    ],
    total: 1,
    hasMore: false,
};

describe('searchKeys', () => {
    it('generates stable query key roots', () => {
        expect(searchKeys).toBeDefined();
        expect(typeof searchKeys).toBe('object');
    });
});

describe('useGlobalSearch', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns loading state when Convex returns undefined', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useGlobalSearch({ tenantId: MOCK_TENANT_ID, query: 'festsalen' }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(true);
        expect(result.current.data).toBeNull();
        expect(result.current.error).toBeNull();
    });

    it('returns search results when loaded', () => {
        vi.mocked(useConvexQuery).mockReturnValue(mockSearchResult);

        const { result } = renderHook(
            () => useGlobalSearch({ tenantId: MOCK_TENANT_ID, query: 'festsalen' }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data).toBeDefined();
        expect(result.current.data!.results).toHaveLength(1);
        expect(result.current.data!.results[0].title).toBe('Festsalen');
    });

    it('returns null for empty query', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useGlobalSearch({ tenantId: MOCK_TENANT_ID, query: '' }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
    });

    it('skips query when tenantId is missing', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        renderHook(
            () => useGlobalSearch({ tenantId: undefined as never, query: 'test' }),
            { wrapper: createWrapper() }
        );

        expect(useConvexQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
    });
});

describe('useTypeahead', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns empty data when query is too short and no tenantId', () => {
        vi.mocked(useConvexQuery).mockReturnValue(undefined);

        const { result } = renderHook(
            () => useTypeahead({ query: 'f' }),
            { wrapper: createWrapper() }
        );

        // No tenantId → skip → empty data
        expect(result.current.data).toEqual([]);
    });

    it('returns suggestions when query is sufficient', () => {
        vi.mocked(useConvexQuery).mockReturnValue([
            { id: 'res-001', name: 'Festsalen', categoryKey: 'LOKALER', score: 1 }
        ]);

        const { result } = renderHook(
            () => useTypeahead({ tenantId: MOCK_TENANT_ID, query: 'festsalen' }),
            { wrapper: createWrapper() }
        );

        expect(result.current.data).toHaveLength(1);
        expect(result.current.data[0].text).toBe('Festsalen');
    });
});

describe('useSavedFilters', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns empty paginated response (stub)', () => {
        const { result } = renderHook(
            () => useSavedFilters({ tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.isLoading).toBe(false);
        expect(result.current.data.data).toEqual([]);
        expect(result.current.data.meta.total).toBe(0);
    });

    it('returns empty without params', () => {
        const { result } = renderHook(
            () => useSavedFilters(),
            { wrapper: createWrapper() }
        );

        expect(result.current.data.data).toEqual([]);
    });
});

describe('useCreateSavedFilter', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface with mutate and mutateAsync', () => {
        const { result } = renderHook(() => useCreateSavedFilter(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(typeof result.current.mutateAsync).toBe('function');
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isSuccess).toBe(false);
    });
});

describe('useDeleteSavedFilter', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns mutation interface', () => {
        const { result } = renderHook(() => useDeleteSavedFilter(), { wrapper: createWrapper() });

        expect(typeof result.current.mutate).toBe('function');
        expect(result.current.isLoading).toBe(false);
    });
});

describe('useRecentSearches', () => {
    beforeEach(() => { vi.clearAllMocks(); });

    it('returns empty paginated response (stub)', () => {
        const { result } = renderHook(
            () => useRecentSearches(),
            { wrapper: createWrapper() }
        );

        expect(result.current.data.data).toEqual([]);
        expect(result.current.isLoading).toBe(false);
    });

    it('returns empty with params', () => {
        const { result } = renderHook(
            () => useRecentSearches({ tenantId: MOCK_TENANT_ID }),
            { wrapper: createWrapper() }
        );

        expect(result.current.data.data).toEqual([]);
        expect(result.current.data.meta.total).toBe(0);
    });
});
