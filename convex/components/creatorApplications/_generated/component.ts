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
    functions: {
      countsByStatus: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        {
          approved: number;
          draft: number;
          in_review: number;
          needs_more_info: number;
          rejected: number;
          submitted: number;
          total: number;
        },
        Name
      >;
      deleteDraft: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      getForApplicant: FunctionReference<
        "query",
        "internal",
        { applicantUserId: string; tenantId: string },
        any,
        Name
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listByStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; status: string; tenantId: string },
        Array<any>,
        Name
      >;
      submit: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      updateStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; reviewNote?: string; reviewedBy: string; status: string },
        { previousStatus: string; success: boolean },
        Name
      >;
      upsertDraft: FunctionReference<
        "mutation",
        "internal",
        {
          ageConfirmed: boolean;
          applicantUserId: string;
          avatarStorageId?: string;
          bio: string;
          country: string;
          dateOfBirth?: string;
          displayName: string;
          externalLinks: Array<{ label: string; url: string }>;
          fullName: string;
          handle: string;
          idDocumentStorageId?: string;
          nicheTags: Array<string>;
          primarySports: Array<string>;
          rulesAccepted: boolean;
          sampleNotes?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
    };
  };
