/**
 * Amenity Types
 * 
 * Tenant-configurable amenity/facility types.
 */

import type { TenantId, AmenityId, Metadata } from './common';

// =============================================================================
// Amenity Types
// =============================================================================

export interface Amenity {
    id: AmenityId;
    tenantId: TenantId;
    groupId?: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    displayOrder: number;
    isHighlighted: boolean;
    isActive: boolean;
    metadata?: Metadata;
}

export interface AmenityGroup {
    id: string;
    tenantId: TenantId;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    displayOrder: number;
    isActive: boolean;
    metadata?: Metadata;
    amenities?: Amenity[];
}

// =============================================================================
// Amenity Option Types (for UI)
// =============================================================================

export interface AmenityOption {
    id: string;
    key: string;
    label: string;
    icon?: string;
}

export interface FacilityOption {
    id: string;
    key: string;
    label: string;
    icon?: string;
}

// =============================================================================
// Amenity Input Types
// =============================================================================

export interface CreateAmenityInput {
    tenantId: TenantId;
    groupId?: string;
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
    isHighlighted?: boolean;
}

export interface UpdateAmenityInput {
    id: AmenityId;
    name?: string;
    description?: string;
    icon?: string;
    displayOrder?: number;
    isHighlighted?: boolean;
    isActive?: boolean;
}

// =============================================================================
// Amenity Query Types
// =============================================================================

export interface AmenityQueryParams {
    tenantId: TenantId;
    groupId?: string;
    includeInactive?: boolean;
}
