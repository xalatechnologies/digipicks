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
      createSyncLogEntry: FunctionReference<
        "mutation",
        "internal",
        {
          action: "assign" | "remove";
          discordRoleId: string;
          discordUserId: string;
          guildId: string;
          membershipId?: string;
          tenantId: string;
          tierId?: string;
          trigger: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      disconnectUser: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string; userId: string },
        { success: boolean },
        Name
      >;
      getConnection: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        any,
        Name
      >;
      getConnectionByDiscordId: FunctionReference<
        "query",
        "internal",
        { discordUserId: string },
        any,
        Name
      >;
      getRoleMappingByTier: FunctionReference<
        "query",
        "internal",
        { tenantId: string; tierId: string },
        any,
        Name
      >;
      getServerConfig: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        any,
        Name
      >;
      listConnections: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listPendingSyncs: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<any>,
        Name
      >;
      listRoleMappings: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<any>,
        Name
      >;
      listSyncLog: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string; userId: string },
        Array<any>,
        Name
      >;
      removeRoleMapping: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string; tierId: string },
        { success: boolean },
        Name
      >;
      toggleServerConfig: FunctionReference<
        "mutation",
        "internal",
        { creatorId: string; isEnabled: boolean; tenantId: string },
        { success: boolean },
        Name
      >;
      updateSyncLogStatus: FunctionReference<
        "mutation",
        "internal",
        { error?: string; id: string; status: "success" | "failed" },
        { success: boolean },
        Name
      >;
      upsertConnection: FunctionReference<
        "mutation",
        "internal",
        {
          accessToken: string;
          discordUserId: string;
          discordUsername: string;
          refreshToken: string;
          scopes: Array<string>;
          tenantId: string;
          tokenExpiresAt: number;
          userId: string;
        },
        { id: string },
        Name
      >;
      upsertRoleMapping: FunctionReference<
        "mutation",
        "internal",
        {
          creatorId: string;
          discordRoleId: string;
          discordRoleName?: string;
          tenantId: string;
          tierId: string;
        },
        { id: string },
        Name
      >;
      upsertServerConfig: FunctionReference<
        "mutation",
        "internal",
        {
          botToken: string;
          clientId: string;
          clientSecret: string;
          creatorId: string;
          guildId: string;
          guildName?: string;
          isEnabled?: boolean;
          tenantId: string;
        },
        { id: string },
        Name
      >;
    };
  };
