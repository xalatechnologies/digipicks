/**
 * Auth Types
 * 
 * Authentication and authorization types.
 */

import type { UserId, TenantId, OrganizationId, Timestamps } from './common';

// =============================================================================
// User Types
// =============================================================================

export interface User extends Timestamps {
    id: UserId;
    authUserId?: string;
    tenantId?: TenantId;
    organizationId?: OrganizationId;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    phoneNumber?: string;
    nin?: string;
    role: UserRole;
    status: UserStatus;
    metadata?: Record<string, unknown>;
    lastLoginAt?: string;
}

export type UserRole = 
    | 'super_admin'
    | 'tenant_admin'
    | 'org_admin'
    | 'manager'
    | 'staff'
    | 'user'
    | 'guest';

export type UserStatus = 'active' | 'inactive' | 'invited' | 'suspended' | 'deleted';

// =============================================================================
// Auth State Types
// =============================================================================

export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
}

export interface AuthUser {
    id: string;
    email: string;
    name?: string;
    avatarUrl?: string;
    role: UserRole;
    tenantId?: string;
    organizationId?: string;
    permissions?: string[];
}

// =============================================================================
// Session Types
// =============================================================================

export interface Session {
    id: string;
    userId: UserId;
    token: string;
    provider: AuthProvider;
    appId?: string;
    expiresAt: number;
    lastActiveAt: number;
    isActive: boolean;
}

export type AuthProvider = 'vipps' | 'signicat' | 'email' | 'demo';

// =============================================================================
// Permission Types
// =============================================================================

export type Permission = 
    | 'read:listings'
    | 'write:listings'
    | 'delete:listings'
    | 'read:bookings'
    | 'write:bookings'
    | 'approve:bookings'
    | 'read:users'
    | 'write:users'
    | 'read:organizations'
    | 'write:organizations'
    | 'read:reports'
    | 'write:settings'
    | 'admin:tenant'
    | 'admin:system';

export interface Role {
    id: string;
    tenantId: TenantId;
    name: string;
    description?: string;
    permissions: Permission[];
    isDefault: boolean;
    isSystem: boolean;
}
