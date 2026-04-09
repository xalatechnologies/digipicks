/**
 * useBackofficeWebMCPTools — registers admin WebMCP tools with the browser
 *
 * Call once in BackofficeLayoutBridge. Exposes dashboard stats, booking
 * management, listing publish/unpublish, user administration, audit log,
 * and messaging tools. All tools require authentication.
 *
 * Uses provideContext() when available (Chrome 146+), falling back to
 * individual registerTool() calls on older builds.
 *
 * @example
 * ```tsx
 * import { useBackofficeWebMCPTools } from '@digipicks/sdk';
 *
 * function BackofficeLayoutBridge() {
 *   useBackofficeWebMCPTools();
 *   return <DashboardLayout variant="backoffice" ... />;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useConvex } from 'convex/react';
import { useSessionTenantId } from '../hooks/use-tenant-id';
import { useAuth } from '../hooks/use-auth';
import type { WebMCPContext, ModelContextTool } from './types';
import {
  createListAllListingsTool,
  createListUsersTool,
  createGetAuditLogTool,
  createPublishListingTool,
  createUnpublishListingTool,
  createSuspendUserTool,
  createReactivateUserTool,
  createAdminSendMessageTool,
  createResolveConversationTool,
} from './tools-backoffice';

export interface UseBackofficeWebMCPToolsOptions {
  enabled?: boolean;
}

export function useBackofficeWebMCPTools(options?: UseBackofficeWebMCPToolsOptions) {
  const enabled = options?.enabled ?? true;
  const convex = useConvex();
  const tenantId = useSessionTenantId('backoffice');
  const { user } = useAuth({ appId: 'backoffice' });
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !navigator.modelContext || !tenantId || !userId) return;

    const ctx: WebMCPContext = {
      convex: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: (fn: any, args: any) => convex.query(fn, args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation: (fn: any, args: any) => convex.mutation(fn, args),
      },
      tenantId,
      userId,
    };

    const tools: ModelContextTool[] = [
      // Read-only tools
      createListAllListingsTool(ctx),
      createListUsersTool(ctx),
      createGetAuditLogTool(ctx),
      // Mutation tools
      createPublishListingTool(ctx),
      createUnpublishListingTool(ctx),
      createSuspendUserTool(ctx),
      createReactivateUserTool(ctx),
      createAdminSendMessageTool(ctx),
      createResolveConversationTool(ctx),
    ];

    const mc = navigator.modelContext!;

    // Prefer provideContext() for SPA-friendly atomic replacement
    if (mc.provideContext) {
      mc.provideContext({ tools });
    } else {
      tools.forEach((t) => mc.registerTool(t));
    }

    return () => {
      tools.forEach((t) => mc.unregisterTool(t.name));
    };
  }, [enabled, convex, tenantId, userId]);
}
