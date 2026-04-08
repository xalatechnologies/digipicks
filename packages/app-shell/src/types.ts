/**
 * App Shell Types
 *
 * Minimal shapes for shell layout and auth/tenant providers.
 * Kept as plain interfaces (id: string) for compatibility with SDK/convex response shapes.
 * Structurally compatible with shared auth/tenant; shared uses branded IDs.
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  /** Tenant-scoped user (from SDK session) */
  tenantId?: string;
  /** Role for RBAC (admin, manager, member, etc.) */
  role?: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan?: string;
}

export interface AuthState {
    isAuthenticated: boolean;
    isLoading: boolean;
    user: User | null;
    accessToken: string | null;
    error: Error | null;
}

export interface TenantState {
    tenant: Tenant | null;
    isLoading: boolean;
    enabledModules: string[];
    permissions: string[];
}

export interface PermissionCheck {
    permission: string;
    granted: boolean;
}

export interface ModuleCheck {
    module: string;
    enabled: boolean;
}
