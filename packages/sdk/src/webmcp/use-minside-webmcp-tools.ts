/**
 * useMinsideWebMCPTools — registers user-facing WebMCP tools with the browser
 *
 * Call once in the minside layout. Exposes personal bookings, billing,
 * profile, messaging, and booking cancellation tools. All tools require
 * the user to be authenticated.
 *
 * Uses provideContext() when available (Chrome 146+), falling back to
 * individual registerTool() calls on older builds.
 *
 * @example
 * ```tsx
 * import { useMinsideWebMCPTools } from '@digilist-saas/sdk';
 *
 * function MinsideLayout() {
 *   useMinsideWebMCPTools();
 *   return <DashboardLayout variant="minside" />;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useConvex } from 'convex/react';
import { useSessionTenantId } from '../hooks/use-tenant-id';
import { useAuth } from '../hooks/use-auth';
import type { WebMCPContext, ModelContextTool } from './types';
import {
  createGetMyBillingSummaryTool,
  createGetMyInvoicesTool,
  createGetMyProfileTool,
  createGetMyConversationsTool,
  createGetConversationMessagesTool,
  createUpdateMyProfileTool,
  createUserSendMessageTool,
} from './tools-minside';

export interface UseMinsideWebMCPToolsOptions {
  enabled?: boolean;
}

export function useMinsideWebMCPTools(options?: UseMinsideWebMCPToolsOptions) {
  const enabled = options?.enabled ?? true;
  const convex = useConvex();
  const tenantId = useSessionTenantId('minside');
  const { user } = useAuth({ appId: 'minside' });
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
      // Read-only
      createGetMyBillingSummaryTool(ctx),
      createGetMyInvoicesTool(ctx),
      createGetMyProfileTool(ctx),
      createGetMyConversationsTool(ctx),
      createGetConversationMessagesTool(ctx),
      // Mutations
      createUpdateMyProfileTool(ctx),
      createUserSendMessageTool(ctx),
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
