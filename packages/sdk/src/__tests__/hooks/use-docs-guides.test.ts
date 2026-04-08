/**
 * useDocsGuides Hooks Tests
 *
 * Tests for api.domain.guides SDK hooks (listGuides, getGuide, getArticle, markArticleRead).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { ConvexProvider } from 'convex/react';
import {
  useDocsGuidesList,
  useDocsGuide,
  useDocsArticle,
  useDocsUserProgress,
  useMarkArticleRead,
} from '@/hooks/use-docs-guides';
import { mockConvexClient } from '../mocks/convex';

vi.mock('convex/react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('convex/react')>();
  return {
    ...actual,
    useQuery: vi.fn(),
    useMutation: vi.fn(),
  };
});

vi.mock('@/hooks/convex-utils', async () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

import { useQuery as useCachedQuery, useMutation as useCachedMutation } from '@/hooks/convex-utils';

const createWrapper = () =>
  ({ children }: { children: React.ReactNode }) =>
    React.createElement(ConvexProvider, {
      client: mockConvexClient as never,
      children,
    });

const mockGuides = [
  {
    _id: 'guide-1',
    slug: 'getting-started',
    title: 'Getting Started',
    description: 'Learn the basics',
  },
  {
    _id: 'guide-2',
    slug: 'advanced',
    title: 'Advanced Guide',
    description: 'Advanced topics',
  },
];

const mockGuide = {
  _id: 'guide-1',
  slug: 'getting-started',
  title: 'Getting Started',
  description: 'Learn the basics',
  sections: [
    {
      _id: 'section-1',
      title: 'Introduction',
      articles: [{ slug: 'overview', title: 'Overview' }],
    },
  ],
};

const mockArticle = {
  _id: 'article-1',
  slug: 'overview',
  title: 'Overview',
  content: 'Content here',
};

describe('useDocsGuidesList', () => {
  beforeEach(() => {
    vi.mocked(useCachedQuery).mockReturnValue(undefined as never);
  });

  it('returns undefined when loading', () => {
    vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

    const { result } = renderHook(
      () => useDocsGuidesList({ tenantId: 'tenant-1' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeUndefined();
  });

  it('returns guides when loaded', () => {
    vi.mocked(useCachedQuery).mockReturnValue(mockGuides as never);

    const { result } = renderHook(
      () => useDocsGuidesList({ tenantId: 'tenant-1' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual(mockGuides);
  });

  it('passes optional category and isPublished', () => {
    vi.mocked(useCachedQuery).mockReturnValue([] as never);

    renderHook(
      () =>
        useDocsGuidesList({
          tenantId: 'tenant-1',
          category: 'docs',
          isPublished: true,
        }),
      { wrapper: createWrapper() }
    );

    expect(useCachedQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        tenantId: 'tenant-1',
        category: 'docs',
        isPublished: true,
      })
    );
  });
});

describe('useDocsGuide', () => {
  it('returns undefined when loading', () => {
    vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

    const { result } = renderHook(
      () => useDocsGuide({ tenantId: 'tenant-1', slug: 'getting-started' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toBeUndefined();
  });

  it('returns guide when loaded', () => {
    vi.mocked(useCachedQuery).mockReturnValue(mockGuide as never);

    const { result } = renderHook(
      () => useDocsGuide({ tenantId: 'tenant-1', slug: 'getting-started' }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual(mockGuide);
  });

  it('passes skip when args is skip', () => {
    vi.mocked(useCachedQuery).mockReturnValue(undefined as never);

    renderHook(() => useDocsGuide('skip'), { wrapper: createWrapper() });

    expect(useCachedQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
  });
});

describe('useDocsArticle', () => {
  it('returns article when loaded', () => {
    vi.mocked(useCachedQuery).mockReturnValue(mockArticle as never);

    const { result } = renderHook(
      () =>
        useDocsArticle({
          tenantId: 'tenant-1',
          guideSlug: 'getting-started',
          articleSlug: 'overview',
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current).toEqual(mockArticle);
  });

  it('passes skip when args is skip', () => {
    vi.mocked(useCachedQuery).mockReturnValue(null as never);

    renderHook(() => useDocsArticle('skip'), { wrapper: createWrapper() });

    expect(useCachedQuery).toHaveBeenCalledWith(expect.anything(), 'skip');
  });
});

describe('useDocsUserProgress', () => {
  it('passes userId and guideId to query', () => {
    vi.mocked(useCachedQuery).mockReturnValue(null as never);

    renderHook(
      () =>
        useDocsUserProgress({
          userId: 'user-1',
          guideId: 'guide-1' as never,
        }),
      { wrapper: createWrapper() }
    );

    expect(useCachedQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        userId: 'user-1',
        guideId: 'guide-1',
      })
    );
  });
});

describe('useMarkArticleRead', () => {
  it('returns mutation adapter shape', () => {
    const mockMutate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCachedMutation).mockReturnValue(mockMutate as never);

    const { result } = renderHook(() => useMarkArticleRead(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
  });

  it('calls mutation with correct args via mutateAsync', async () => {
    const mockMutate = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useCachedMutation).mockReturnValue(mockMutate as never);

    const { result } = renderHook(() => useMarkArticleRead(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      userId: 'user-1',
      articleId: 'article-1' as never,
    });

    expect(mockMutate).toHaveBeenCalledWith({
      userId: 'user-1',
      articleId: 'article-1',
    });
  });
});
