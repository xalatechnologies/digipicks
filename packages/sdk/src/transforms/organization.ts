/**
 * DigilistSaaS SDK - Organization & User Transforms
 *
 * Maps between the Convex organization/user shapes and the SDK shapes.
 */

import type { Organization, User } from '../hooks/use-organizations';

/** Raw Convex organization document shape. */
export interface ConvexOrganization {
    _id: string;
    _creationTime: number;
    tenantId: string;
    name: string;
    slug: string;
    description?: string;
    type: string;
    parentId?: string;
    status: string;
    settings?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
    parent?: Record<string, unknown> | null;
    children?: ConvexOrganization[];
}

/** Raw Convex user document shape. */
export interface ConvexUser {
    _id: string;
    _creationTime: number;
    tenantId: string;
    organizationId?: string;
    email: string;
    name?: string;
    displayName?: string;
    avatarUrl?: string;
    role: string;
    status: string;
    metadata?: Record<string, unknown>;
    tenant?: Record<string, unknown> | null;
    organization?: Record<string, unknown> | null;
}

/**
 * Transform a raw Convex organization document into the SDK `Organization` shape.
 */
export function transformOrganization(raw: ConvexOrganization): Organization {
    return {
        id: raw._id as string,
        tenantId: raw.tenantId as string,
        name: raw.name,
        slug: raw.slug,
        description: raw.description,
        type: raw.type,
        parentId: raw.parentId as string | undefined,
        status: raw.status,
        settings: raw.settings,
        metadata: raw.metadata,
        createdAt: new Date(raw._creationTime).toISOString(),
    };
}

/**
 * Transform a raw Convex organization document with children into the SDK shape.
 */
export function transformOrganizationWithChildren(raw: ConvexOrganization): Organization {
    return {
        ...transformOrganization(raw),
        parent: raw.parent ?? null,
        children: raw.children
            ? raw.children.map(transformOrganization)
            : [],
    };
}

/**
 * Transform a raw Convex user document into the SDK `User` shape.
 */
export function transformUser(raw: ConvexUser): User {
    return {
        id: raw._id as string,
        tenantId: raw.tenantId as string,
        organizationId: raw.organizationId as string | undefined,
        email: raw.email,
        name: raw.name,
        displayName: raw.displayName,
        avatarUrl: raw.avatarUrl,
        role: raw.role,
        status: raw.status,
        metadata: raw.metadata,
        createdAt: new Date(raw._creationTime).toISOString(),
    };
}

/**
 * Transform a raw Convex user document with joined tenant/org data.
 */
export function transformCurrentUser(raw: ConvexUser): User {
    return {
        ...transformUser(raw),
        tenant: raw.tenant ?? null,
        organization: raw.organization ?? null,
    };
}
