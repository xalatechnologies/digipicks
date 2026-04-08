/**
 * DigilistSaaS SDK - Review Transforms
 *
 * Maps between the Convex review shape and the SDK Review shape.
 */

import type { Review, ReviewStatus } from '../hooks/use-reviews';

/** Raw Convex review document shape. */
export interface ConvexReview {
    _id: string;
    _creationTime: number;
    tenantId: string;
    resourceId: string;
    userId: string;
    rating: number;
    title?: string;
    text?: string;
    status: string;
    moderationNote?: string;
    moderatedBy?: string;
    moderatedAt?: number;
    metadata?: Record<string, unknown>;
    helpfulCount?: number;
    user?: { id: string; name?: string; email?: string };
    resourceName?: string;
}

/**
 * Transform a raw Convex review document into the SDK `Review` shape.
 *
 * - `text` -> `body`
 * - `moderationNote` -> `moderatorNotes`
 * - Epoch timestamps -> ISO strings
 * - `resourceName` -> `listingName`
 */
export function transformReview(convexReview: ConvexReview): Review {
    const user = convexReview.user;
    return {
        id: convexReview._id,
        tenantId: convexReview.tenantId,
        resourceId: convexReview.resourceId,
        userId: convexReview.userId,
        rating: convexReview.rating,
        title: convexReview.title,
        body: convexReview.text,
        status: convexReview.status as ReviewStatus,
        moderatorNotes: convexReview.moderationNote,
        moderatedBy: convexReview.moderatedBy,
        moderatedAt: convexReview.moderatedAt ? new Date(convexReview.moderatedAt).toISOString() : undefined,
        metadata: {
            ...convexReview.metadata,
            helpfulCount: convexReview.helpfulCount ?? convexReview.metadata?.helpfulCount,
        },
        createdAt: new Date(convexReview._creationTime).toISOString(),
        user: user,
        userName: user?.name,
        userEmail: user?.email,
        listingName: convexReview.resourceName,
    };
}
