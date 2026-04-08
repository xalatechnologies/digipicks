/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    import: {
      importArticle: FunctionReference<
        "mutation",
        "internal",
        {
          content?: string;
          guideId: string;
          isPublished: boolean;
          order: number;
          sectionId: string;
          slug: string;
          tenantId: string;
          title: string;
          videoUrl?: string;
        },
        { id: string },
        Name
      >;
      importGuide: FunctionReference<
        "mutation",
        "internal",
        {
          authorId?: string;
          category?: string;
          description: string;
          isPublished: boolean;
          slug: string;
          tenantId: string;
          title: string;
        },
        { id: string },
        Name
      >;
      importSection: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          guideId: string;
          isPublished: boolean;
          order: number;
          tenantId: string;
          title: string;
        },
        { id: string },
        Name
      >;
    };
    mutations: {
      markArticleRead: FunctionReference<
        "mutation",
        "internal",
        {
          articleId: string;
          guideId: string;
          tenantId: string;
          userId: string;
        },
        any,
        Name
      >;
    };
    queries: {
      getArticle: FunctionReference<
        "query",
        "internal",
        { articleSlug: string; guideSlug: string; tenantId: string },
        any,
        Name
      >;
      getGuide: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any,
        Name
      >;
      getUserProgress: FunctionReference<
        "query",
        "internal",
        { guideId: string; userId: string },
        null | {
          _id: string;
          completedArticles: Array<string>;
          lastAccessedAt: number;
          status: string;
        },
        Name
      >;
      listGuides: FunctionReference<
        "query",
        "internal",
        { category?: string; isPublished?: boolean; tenantId: string },
        Array<any>,
        Name
      >;
    };
  };
