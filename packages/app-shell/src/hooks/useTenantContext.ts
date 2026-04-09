/**
 * useTenantContext — Central tenant resolution for dashboard pages.
 *
 * Replaces scattered env.tenantId / useSessionTenantId() calls.
 * Derives tenantId from the authenticated user's role and mode:
 *
 *   superadmin → env.tenantId || user.tenantId (cross-tenant, env selects which)
 *   admin      → env.tenantId || user.tenantId (admin always on a tenant)
 *   user+owner+utleier → user.tenantId (their own tenant)
 *   user+leietaker or normal → undefined (personal context)
 */

import { useMemo } from 'react';
import { useAuthBridge } from '../providers/AuthBridge';
import { useRoleContext } from '../providers/RoleProvider';
import { useModeOptional } from '../providers/ModeProvider';
import { env } from '../env';

export interface TenantContextValue {
  /** Resolved tenantId for data queries. undefined = no tenant context (personal mode). */
  tenantId: string | undefined;
  /** Source of the tenantId resolution */
  source: 'superadmin' | 'admin' | 'creator' | 'subscriber' | 'none';
  /** Whether the current context has a management tenant */
  hasTenant: boolean;
}

export function useTenantContext(): TenantContextValue {
  const { user } = useAuthBridge();
  const { effectiveRole } = useRoleContext();
  const modeCtx = useModeOptional();

  return useMemo(() => {
    if (effectiveRole === 'superadmin') {
      const tid = env.tenantId || user?.tenantId || undefined;
      return { tenantId: tid, source: 'superadmin' as const, hasTenant: !!tid };
    }

    if (effectiveRole === 'admin') {
      const tid = env.tenantId || user?.tenantId || undefined;
      return { tenantId: tid, source: 'admin' as const, hasTenant: !!tid };
    }

    if (effectiveRole === 'creator' && user?.tenantId) {
      return { tenantId: user.tenantId, source: 'creator' as const, hasTenant: true };
    }

    // Subscriber — use env.tenantId as fallback for read-only queries.
    const fallback = env.tenantId || undefined;
    return { tenantId: fallback, source: 'subscriber' as const, hasTenant: false };
  }, [effectiveRole, user?.tenantId, modeCtx?.mode]);
}
