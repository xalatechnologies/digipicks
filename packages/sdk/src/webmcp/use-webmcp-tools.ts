/**
 * useWebMCPTools — registers WebMCP tools with the browser
 *
 * Call once in your app layout (e.g. MainLayout). Tools are automatically
 * registered on mount and unregistered on unmount. Mutation tools (booking,
 * cancel, favorite) are only registered when the user is authenticated.
 *
 * Uses provideContext() when available (Chrome 146+), falling back to
 * individual registerTool() calls on older builds.
 *
 * @example
 * ```tsx
 * import { useWebMCPTools } from '@digipicks/sdk';
 *
 * function MainLayout() {
 *   useWebMCPTools();
 *   return <Outlet />;
 * }
 * ```
 */

import { useEffect } from 'react';
import { useConvex } from 'convex/react';
import { useSessionTenantId } from '../hooks/use-tenant-id';
import { useAuth } from '../hooks/use-auth';
import type { WebMCPContext, ModelContextTool } from './types';
import { createSearchListingsTool, createGetListingDetailsTool, createToggleFavoriteTool } from './tools';

export interface UseWebMCPToolsOptions {
  /** Disable tool registration (default: true) */
  enabled?: boolean;
}

export function useWebMCPTools(options?: UseWebMCPToolsOptions) {
  const enabled = options?.enabled ?? true;
  const convex = useConvex();
  const tenantId = useSessionTenantId();
  const { user } = useAuth();
  const userId = user?.id;

  useEffect(() => {
    if (!enabled || !navigator.modelContext || !tenantId) return;

    const ctx: WebMCPContext = {
      convex: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        query: (fn: any, args: any) => convex.query(fn, args),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mutation: (fn: any, args: any) => convex.mutation(fn, args),
      },
      tenantId,
      userId: userId || undefined,
    };

    // Read-only tools — always registered
    const tools: ModelContextTool[] = [createSearchListingsTool(ctx), createGetListingDetailsTool(ctx)];

    // Mutation tools — only when authenticated
    if (userId) {
      tools.push(createToggleFavoriteTool(ctx));
    }

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
