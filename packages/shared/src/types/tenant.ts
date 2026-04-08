/**
 * Tenant Types
 * 
 * Multi-tenant organization types.
 */

import type { TenantId, OrganizationId, UserId, Timestamps, Metadata } from './common';

// =============================================================================
// Tenant Types
// =============================================================================

export interface Tenant extends Timestamps {
    id: TenantId;
    name: string;
    slug: string;
    domain?: string;
    status: TenantStatus;
    settings: TenantSettings;
    seatLimits?: SeatLimits;
    featureFlags?: FeatureFlags;
    enabledCategories: string[];
    deletedAt?: string;
}

export type TenantStatus = 'active' | 'suspended' | 'pending' | 'deleted';

export interface TenantSettings {
    locale?: string;
    timezone?: string;
    currency?: string;
    branding?: TenantBranding;
    features?: Record<string, boolean>;
}

export interface TenantBranding {
    logo?: string;
    primaryColor?: string;
    secondaryColor?: string;
}

export interface SeatLimits {
    maxUsers?: number;
    maxOrganizations?: number;
    maxResources?: number;
}

export type FeatureFlags = Record<string, boolean>;

// =============================================================================
// Organization Types
// =============================================================================

export interface Organization extends Timestamps {
    id: OrganizationId;
    tenantId: TenantId;
    parentId?: OrganizationId;
    name: string;
    slug: string;
    description?: string;
    type: OrganizationType;
    status: OrganizationStatus;
    settings: Metadata;
    metadata: Metadata;
    deletedAt?: string;
}

export type OrganizationType = 
    | 'municipality'
    | 'department'
    | 'club'
    | 'association'
    | 'company'
    | 'school'
    | 'other';

export type OrganizationStatus = 'active' | 'inactive' | 'suspended' | 'deleted';

// =============================================================================
// Tenant User Types
// =============================================================================

export interface TenantUser {
    id: string;
    tenantId: TenantId;
    userId: UserId;
    status: TenantUserStatus;
    invitedByUserId?: UserId;
    invitedAt?: string;
    joinedAt?: string;
}

export type TenantUserStatus = 'active' | 'invited' | 'suspended' | 'removed';
