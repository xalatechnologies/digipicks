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
    mutations: {
      cleanupExpired: FunctionReference<
        "mutation",
        "internal",
        {},
        {
          magicLinks: number;
          oauthStates: number;
          sessions: number;
          verifications: number;
        },
        Name
      >;
      consumeMagicLink: FunctionReference<
        "mutation",
        "internal",
        { token: string },
        any,
        Name
      >;
      consumeOAuthState: FunctionReference<
        "mutation",
        "internal",
        { state: string },
        any,
        Name
      >;
      createDemoToken: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: number;
          key: string;
          organizationId?: string;
          tenantId: string;
          tokenHash: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      createMagicLink: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          email: string;
          expiresAt: number;
          returnPath: string;
          token: string;
        },
        { id: string },
        Name
      >;
      createOAuthState: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          expiresAt: number;
          provider: string;
          returnPath: string;
          signicatSessionId?: string;
          state: string;
        },
        { id: string },
        Name
      >;
      createSession: FunctionReference<
        "mutation",
        "internal",
        {
          appId?: string;
          expiresAt: number;
          provider: string;
          token: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      createVerification: FunctionReference<
        "mutation",
        "internal",
        {
          channel: string;
          expiresAt: number;
          maxAttempts?: number;
          purpose: string;
          target: string;
          userId?: string;
        },
        { id: string },
        Name
      >;
      importDemoToken: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: number;
          isActive: boolean;
          key: string;
          organizationId?: string;
          tenantId: string;
          tokenHash: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      importMagicLink: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          consumed: boolean;
          consumedAt?: number;
          createdAt: number;
          email: string;
          expiresAt: number;
          returnPath: string;
          token: string;
        },
        { id: string },
        Name
      >;
      importOAuthState: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          consumed: boolean;
          createdAt: number;
          expiresAt: number;
          provider: string;
          returnPath: string;
          signicatSessionId?: string;
          state: string;
        },
        { id: string },
        Name
      >;
      importSession: FunctionReference<
        "mutation",
        "internal",
        {
          appId?: string;
          expiresAt: number;
          isActive: boolean;
          lastActiveAt: number;
          provider: string;
          token: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      invalidateSession: FunctionReference<
        "mutation",
        "internal",
        { token: string },
        { success: boolean },
        Name
      >;
      touchSession: FunctionReference<
        "mutation",
        "internal",
        { sessionId: string },
        { success: boolean },
        Name
      >;
      updateVerification: FunctionReference<
        "mutation",
        "internal",
        { id: string; incrementAttempts?: boolean; status?: string },
        { exceeded?: boolean; success: boolean },
        Name
      >;
    };
    queries: {
      getSessionByToken: FunctionReference<
        "query",
        "internal",
        { token: string },
        any,
        Name
      >;
      listSessionsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      validateDemoToken: FunctionReference<
        "query",
        "internal",
        { key: string },
        any,
        Name
      >;
      validateSession: FunctionReference<
        "query",
        "internal",
        { token: string },
        any,
        Name
      >;
    };
  };
