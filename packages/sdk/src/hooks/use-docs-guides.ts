/**
 * DigilistSaaS SDK - Docs / User Guides Hooks
 *
 * Wraps api.domain.guides for the user-guides app.
 * Use these instead of direct Convex useQuery/useMutation.
 */

import { useCallback } from "react";
import { useQuery, useMutation } from "./convex-utils";
import { api, type Id } from "../convex-api";
import { useMutationAdapter } from "./utils";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export function useDocsGuidesList(args: {
  tenantId: string;
  category?: string;
  isPublished?: boolean;
}) {
  return useQuery(api.domain.guides.listGuides, args.tenantId ? args : "skip");
}

export function useDocsGuide(args: {
  tenantId: string;
  slug: string;
} | 'skip') {
  return useQuery(api.domain.guides.getGuide, args);
}

export function useDocsArticle(args: {
  tenantId: string;
  guideSlug: string;
  articleSlug: string;
} | 'skip') {
  return useQuery(api.domain.guides.getArticle, args);
}

export function useDocsUserProgress(args: {
  userId: string;
  guideId: Id<'guides'>;
} | 'skip') {
  return useQuery(api.domain.guides.getUserProgress, args);
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Mark an article as read.
 * Returns standard mutation adapter shape: { mutate, mutateAsync, isLoading, error, isSuccess }
 */
export function useMarkArticleRead() {
  const convexMutation = useMutation(api.domain.guides.markArticleRead);
  const fn = useCallback(
    async (args: { userId: string; articleId: Id<'articles'> }): Promise<void> => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- SDK→Convex boundary
      await convexMutation(args as any);
    },
    [convexMutation]
  );
  return useMutationAdapter(fn);
}
