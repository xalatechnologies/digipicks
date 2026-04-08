/**
 * DigilistSaaS SDK - Notification Transforms
 *
 * Maps between the Convex notification shape and the SDK Notification shape.
 */

import type { Notification, NotificationPreferences } from '../hooks/use-notifications';

/** Raw Convex notification document shape. */
export interface ConvexNotification {
    _id: string;
    _creationTime: number;
    tenantId: string;
    userId: string;
    type: string;
    title: string;
    body?: string;
    readAt?: number;
    link?: string;
    metadata?: Record<string, unknown>;
}

/** Raw Convex notification preference shape. */
export interface ConvexNotificationPreference {
    category: string;
    channel: string;
    enabled: boolean;
}

/**
 * Transform a raw Convex notification document into the SDK `Notification` shape.
 *
 * - `link` -> `actionUrl`
 * - Epoch `readAt` -> ISO string
 * - `_creationTime` -> `createdAt` ISO string
 */
export function transformNotification(n: ConvexNotification): Notification {
    return {
        id: n._id as string,
        tenantId: n.tenantId as string,
        userId: n.userId as string,
        type: n.type,
        title: n.title,
        body: n.body ?? "",
        readAt: n.readAt ? new Date(n.readAt).toISOString() : undefined,
        actionUrl: n.link,
        metadata: n.metadata as Record<string, unknown>,
        createdAt: new Date(n._creationTime).toISOString(),
    };
}

/**
 * Transform an array of Convex notification preferences into the SDK
 * `NotificationPreferences` shape.
 */
export function transformNotificationPreferences(
    prefs: ConvexNotificationPreference[]
): NotificationPreferences {
    const result: NotificationPreferences = {
        email: true,
        push: true,
        inApp: true,
        categories: {},
    };

    prefs.forEach((p) => {
        if (!result.categories[p.category]) {
            result.categories[p.category] = { email: true, push: true, inApp: true };
        }
        if (p.channel === "email") result.categories[p.category].email = p.enabled;
        if (p.channel === "push") result.categories[p.category].push = p.enabled;
        if (p.channel === "in_app") result.categories[p.category].inApp = p.enabled;
    });

    return result;
}
