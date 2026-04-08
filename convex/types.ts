/**
 * Convex Type Definitions
 *
 * These types extend @digilist-saas/shared and add Convex-specific fields.
 * Using interfaces for proper type safety.
 */

import type { Id } from "./_generated/dataModel";

// =============================================================================
// STATUS ENUMS
// =============================================================================

export type TenantStatus = "active" | "suspended" | "pending" | "deleted";
export type UserStatus = "active" | "inactive" | "invited" | "suspended" | "deleted";
export type OrganizationStatus = "active" | "inactive" | "suspended" | "deleted";
export type TenantUserStatus = "active" | "invited" | "suspended" | "removed";
export type ResourceStatus = "draft" | "published" | "archived" | "deleted";
export type BookingStatus = "pending" | "confirmed" | "cancelled" | "completed" | "rejected";
export type ConflictSeverity = "low" | "medium" | "high" | "critical";
export type BlockStatus = "active" | "inactive" | "cancelled";
export type LeaseStatus = "pending" | "active" | "expired" | "cancelled";
export type ConversationStatus = "open" | "closed" | "archived";
export type MessageType = "text" | "system" | "notification";
export type SenderType = "user" | "admin" | "system";
export type ApplicationStatus = "pending" | "approved" | "rejected" | "waitlisted";
export type ReportStatus = "pending" | "running" | "completed" | "failed";

// =============================================================================
// PLATFORM SCHEMA TYPES
// =============================================================================

/** Tenant settings stored as JSON */
export interface TenantSettings {
    locale: string;
    timezone: string;
    currency: string;
    theme: string;
    branding?: {
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
    };
    notifications?: {
        emailEnabled: boolean;
        smsEnabled: boolean;
    };
    installedModules?: string[];
    policies?: Record<string, unknown>;
}

/** Tenant seat limits */
export interface SeatLimits {
    maxUsers: number;
    maxListings: number;
    maxStorageMb: number;
    maxOrganizations?: number;
    maxBookingsPerMonth?: number;
}

/** Feature flags */
export interface FeatureFlags {
    seasonal_leases?: boolean;
    approval_workflow?: boolean;
    messaging?: boolean;
    analytics?: boolean;
    integrations?: boolean;
    [key: string]: boolean | undefined;
}

/** User metadata */
export interface UserMetadata {
    isFounder?: boolean;
    provider?: string;
    linkedProviders?: Record<
        string,
        {
            id: string;
            linkedAt: number;
            data?: unknown;
        }
    >;
    consent?: {
        marketing: boolean;
        analytics: boolean;
        thirdParty: boolean;
        necessary: boolean;
        updatedAt: number | null;
    };
    dsarRequests?: Array<{
        id: string;
        type: string;
        details?: string;
        status: string;
        submittedAt: number;
        completedAt: number | null;
    }>;
    [key: string]: unknown;
}

// =============================================================================
// DOMAIN SCHEMA TYPES
// =============================================================================

/** Resource pricing configuration */
export interface ResourcePricingConfig {
    basePrice?: number;
    pricePerHour?: number;
    pricePerDay?: number;
    currency?: string;
    deposit?: number;
    cleaningFee?: number;
}

/** Resource feature */
export interface ResourceFeature {
    name: string;
    value?: string | number | boolean;
    icon?: string;
}

/** Image reference */
export interface ImageRef {
    url: string;
    alt?: string;
    width?: number;
    height?: number;
    isPrimary?: boolean;
}

/** Recurring schedule configuration */
export interface RecurringConfig {
    frequency: "daily" | "weekly" | "monthly";
    interval: number;
    daysOfWeek?: number[];
    endDate?: number;
    maxOccurrences?: number;
}

/** Booking metadata */
export interface BookingMetadata {
    source?: string;
    referrer?: string;
    notes?: string;
    [key: string]: unknown;
}

/** Time slot for popular times */
export interface TimeSlot {
    dayOfWeek: number;
    hour: number;
    bookingCount: number;
}

// =============================================================================
// AUTH TYPES
// =============================================================================

/** OAuth provider info */
export type OAuthProvider = "bankid" | "vipps" | "google" | "azure";

/** Token exchange response */
export interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
}

/** User info from OAuth provider */
export interface OAuthUserInfo {
    sub?: string;
    id?: string;
    email: string;
    name?: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    email_verified?: boolean;
}

// =============================================================================
// RBAC TYPES
// =============================================================================

/** Permission string type */
export type Permission =
    | "tenant:read"
    | "tenant:write"
    | "tenant:admin"
    | "user:read"
    | "user:write"
    | "user:invite"
    | "user:delete"
    | "resource:read"
    | "resource:write"
    | "resource:delete"
    | "resource:publish"
    | "booking:read"
    | "booking:write"
    | "booking:approve"
    | "booking:cancel"
    | "org:read"
    | "org:write"
    | "org:admin"
    | "rbac:read"
    | "rbac:write"
    | "module:install"
    | "module:configure"
    | "billing:read"
    | "billing:write"
    | "reports:read"
    | "reports:export"
    | "review:moderate";

// =============================================================================
// RESOURCE CATEGORY TYPES
// =============================================================================

/** Standard resource categories (align with catalog seed) */
export type ResourceCategory = "LOKALER" | "SPORT" | "ARRANGEMENTER" | "TORGET";

/** Time mode for resources */
export type TimeMode = "PERIOD" | "SLOT" | "DAY" | "WEEK";

// =============================================================================
// CONVEX DOC TYPES (with IDs)
// =============================================================================

/** Base document with Convex ID */
export interface ConvexDoc {
    _id: string;
    _creationTime: number;
}

/** Full tenant document */
export interface TenantDoc extends ConvexDoc {
    name: string;
    slug: string;
    domain?: string;
    settings: TenantSettings;
    status: TenantStatus;
    seatLimits: SeatLimits;
    featureFlags: FeatureFlags;
    enabledCategories: ResourceCategory[];
    deletedAt?: number;
}

/** Full user document */
export interface UserDoc extends ConvexDoc {
    authUserId?: string;
    tenantId?: Id<"tenants">;
    organizationId?: Id<"organizations">;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    role: string;
    status: UserStatus;
    demoToken?: string;
    metadata: UserMetadata;
    deletedAt?: number;
    lastLoginAt?: number;
}

/** Full resource document */
export interface ResourceDoc extends ConvexDoc {
    tenantId: Id<"tenants">;
    organizationId?: Id<"organizations">;
    name: string;
    slug: string;
    description?: string;
    categoryKey: ResourceCategory;
    timeMode: TimeMode;
    features: ResourceFeature[];
    ruleSetKey?: string;
    status: ResourceStatus;
    requiresApproval: boolean;
    capacity?: number;
    inventoryTotal?: number;
    images: ImageRef[];
    pricing: ResourcePricingConfig;
    metadata: Record<string, unknown>;
}

/** Full booking document */
export interface BookingDoc extends ConvexDoc {
    tenantId: Id<"tenants">;
    resourceId: string;
    userId: Id<"users">;
    organizationId?: Id<"organizations">;
    status: BookingStatus;
    startTime: number;
    endTime: number;
    totalPrice: number;
    currency: string;
    notes?: string;
    metadata: BookingMetadata;
    version: number;
    submittedAt?: number;
    approvedBy?: Id<"users">;
    approvedAt?: number;
    rejectionReason?: string;
}
