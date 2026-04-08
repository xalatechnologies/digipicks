/**
 * Category Types
 * 
 * Tenant-configurable category and subcategory types.
 */

import type { TenantId, CategoryId, Metadata } from './common';

// =============================================================================
// Category Types
// =============================================================================

export interface Category {
    id: CategoryId;
    tenantId: TenantId;
    parentId?: CategoryId;
    key: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    settings?: Metadata;
    isActive: boolean;
}

export interface CategoryWithSubcategories extends Category {
    subcategories: Category[];
}

// =============================================================================
// Category Option Types (for UI)
// =============================================================================

export interface CategoryOption {
    id: string;
    key: string;
    label: string;
    icon?: string;
    count?: number;
}

export interface SubcategoryOption {
    id: string;
    key: string;
    label: string;
    parentKey: string;
    icon?: string;
}

// =============================================================================
// Category Input Types
// =============================================================================

export interface CreateCategoryInput {
    tenantId: TenantId;
    parentId?: CategoryId;
    key: string;
    name: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    settings?: Metadata;
}

export interface UpdateCategoryInput {
    id: CategoryId;
    name?: string;
    slug?: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
    settings?: Metadata;
    isActive?: boolean;
}

// =============================================================================
// Category Query Types
// =============================================================================

export interface CategoryQueryParams {
    tenantId: TenantId;
    parentId?: CategoryId;
    includeInactive?: boolean;
}
