/**
 * DigilistSaaS SDK - Notification Hooks (Tier 2)
 *
 * React hooks for in-app notifications, push subscriptions, and
 * notification preferences. Connected to Convex notification functions.
 *
 * Queries:  { data, isLoading, error }
 * Mutations: { mutate, mutateAsync, isLoading, error, isSuccess }
 */

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { api } from "../convex-api";
import type { Id } from "../convex-api";
import { transformNotification, transformNotificationPreferences, type ConvexNotification } from "../transforms/notification";
import { useState, useEffect, useCallback } from "react";
import { useMutationAdapter } from "./utils";

// =============================================================================
// Query Key Factory (inert -- kept for future React Query migration)
// =============================================================================

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (params?: Record<string, unknown>) => [...notificationKeys.all, "list", params] as const,
  my: (params?: Record<string, unknown>) => [...notificationKeys.all, "my", params] as const,
  unreadCount: () => [...notificationKeys.all, "unread-count"] as const,
  templates: () => [...notificationKeys.all, "templates"] as const,
  push: () => [...notificationKeys.all, "push"] as const,
  pushSubscriptions: () => [...notificationKeys.all, "push", "subscriptions"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
  permission: () => [...notificationKeys.all, "push", "permission"] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  readAt?: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationTemplate {
  id: string;
  type: string;
  titleTemplate: string;
  bodyTemplate: string;
  channels: string[];
}

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  provider: "web" | "fcm" | "apns";
  createdAt: string;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  inApp: boolean;
  categories: Record<string, { email: boolean; push: boolean; inApp: boolean }>;
}

// =============================================================================
// Notification Query Hooks (Wired to Convex)
// =============================================================================

/**
 * Get all notifications (admin view).
 * Wraps `api.domain.notifications.listByUser` — for admin view, pass a tenantId + userId.
 * TODO: Add a dedicated admin list-all query when needed. Currently shows user's own notifications.
 */
export function useNotifications(params?: { userId?: Id<"users">; type?: string; limit?: number }) {
  const data = useConvexQuery(
    api.domain.notifications.listByUser,
    params?.userId ? { userId: params.userId, limit: params?.limit } : "skip"
  );

  const isLoading = params?.userId !== undefined && data === undefined;
  const notifications: Notification[] = (data ?? []).map((n) => transformNotification(n as unknown as ConvexNotification));

  return {
    data: { data: notifications },
    notifications,
    isLoading,
    error: null,
  };
}

/**
 * Get current user's notifications.
 * Connected to Convex: api.domain.notifications.listByUser
 */
export function useMyNotifications(
  userId: Id<"users"> | undefined,
  params?: { unreadOnly?: boolean; limit?: number }
) {
  const data = useConvexQuery(
    api.domain.notifications.listByUser,
    userId ? { userId, limit: params?.limit, unreadOnly: params?.unreadOnly } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  // Transform to SDK format
  const notifications: Notification[] = (data ?? []).map((n) => transformNotification(n as unknown as ConvexNotification));

  return {
    data: { data: notifications },
    notifications,
    isLoading,
    error: null,
  };
}

/**
 * Get unread notification count for the current user.
 * Connected to Convex: api.domain.notifications.unreadCount
 */
export function useNotificationUnreadCount(userId?: Id<"users">) {
  const data = useConvexQuery(
    api.domain.notifications.unreadCount,
    userId ? { userId } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  return {
    data: { count: (data as { count?: number } | null)?.count ?? 0 },
    isLoading,
    error: null,
  };
}

/**
 * Get notification templates (admin view).
 * Wraps `api.domain.notifications.listEmailTemplates`.
 */
export function useNotificationTemplates(tenantId?: string) {
  const data = useConvexQuery(
    api.domain.notifications.listEmailTemplates,
    tenantId ? { tenantId } : "skip"
  );

  const isLoading = tenantId !== undefined && data === undefined;
  const templates: NotificationTemplate[] = (data ?? []).map((t: any) => ({
    id: String(t._id ?? t.id ?? ""),
    type: String(t.type ?? t.templateType ?? ""),
    titleTemplate: String(t.subject ?? t.titleTemplate ?? ""),
    bodyTemplate: String(t.body ?? t.bodyTemplate ?? ""),
    channels: Array.isArray(t.channels) ? t.channels : ["email"],
  }));

  return {
    data: { data: templates },
    isLoading,
    error: null,
  };
}

// =============================================================================
// Notification Mutation Hooks (Wired to Convex)
// =============================================================================

/**
 * Mark a single notification as read.
 * Connected to Convex: api.domain.notifications.markAsRead
 */
export function useMarkNotificationRead() {
  const mutation = useConvexMutation(api.domain.notifications.markAsRead);

  return {
    mutate: (args: { id: Id<"notifications"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"notifications"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Mark all notifications as read for the current user.
 * Connected to Convex: api.domain.notifications.markAllAsRead
 */
export function useMarkAllNotificationsRead() {
  const mutation = useConvexMutation(api.domain.notifications.markAllAsRead);

  return {
    mutate: (args: { userId: Id<"users"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { userId: Id<"users"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Delete a notification.
 * Connected to Convex: api.domain.notifications.remove
 */
export function useDeleteNotification() {
  const mutation = useConvexMutation(api.domain.notifications.remove);

  return {
    mutate: (args: { id: Id<"notifications"> }) => {
      mutation(args);
    },
    mutateAsync: async (args: { id: Id<"notifications"> }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

// =============================================================================
// Push Notification Query Hooks (Stubs - needs push infrastructure)
// =============================================================================

/**
 * Get push subscriptions for the current user.
 * Wired to Convex: api.domain.notifications.listPushSubscriptions
 */
export function usePushSubscriptions(userId?: string) {
  const data = useConvexQuery(
    (api.domain.notifications as any).listPushSubscriptions,
    userId ? { userId } : "skip"
  );
  const isLoading = !!userId && data === undefined;
  const subscriptions: PushSubscription[] = (data ?? []).map((s: any) => ({
    id: String(s._id ?? s.id ?? ""),
    userId: String(s.userId ?? ""),
    endpoint: String(s.endpoint ?? ""),
    provider: (s.provider ?? "web") as PushSubscription["provider"],
    createdAt: s.createdAt ? new Date(s.createdAt).toISOString() : new Date().toISOString(),
  }));
  return {
    data: { data: subscriptions },
    isLoading,
    error: null,
  };
}

/**
 * Get notification preferences for the current user.
 * Connected to Convex: api.domain.notifications.getPreferences
 */
export function useNotificationPreferences(userId?: Id<"users">) {
  const data = useConvexQuery(
    api.domain.notifications.getPreferences,
    userId ? { userId } : "skip"
  );

  const isLoading = userId !== undefined && data === undefined;

  // Transform to preferences object
  const prefs: NotificationPreferences = transformNotificationPreferences(data ?? []);

  return {
    data: { data: prefs },
    isLoading,
    error: null,
  };
}

/**
 * Get current push permission status from the browser.
 * Browser-side only: reads Notification.permission.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<"granted" | "denied" | "default">("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission as "granted" | "denied" | "default");
    }
  }, []);

  return {
    data: { data: permission },
    isLoading: false,
    error: null,
  };
}

// =============================================================================
// Push Notification Mutation Hooks (Stubs - needs push infrastructure)
// =============================================================================

/**
 * Register a new push subscription.
 * Wired to Convex: api.domain.notifications.registerPushSubscription
 */
export function useRegisterPushSubscription() {
  const doMutation = useConvexMutation((api.domain.notifications as any).registerPushSubscription);
  const fn = useCallback(
    async (args: { tenantId: string; userId: string; endpoint: string; p256dh: string; auth: string; provider?: string }) => {
      return (await doMutation(args)) as { id: string };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

/**
 * Unsubscribe from all push notifications.
 * Wired to Convex: api.domain.notifications.unsubscribeAllPush
 */
export function useUnsubscribePush() {
  const doMutation = useConvexMutation((api.domain.notifications as any).unsubscribeAllPush);
  const fn = useCallback(
    async (args: { userId: string }) => {
      return (await doMutation(args)) as { success: boolean; count: number };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

/**
 * Delete a specific push subscription by ID.
 * Wired to Convex: api.domain.notifications.deletePushSubscription
 */
export function useDeletePushSubscription() {
  const doMutation = useConvexMutation((api.domain.notifications as any).deletePushSubscription);
  const fn = useCallback(
    async (args: { id: string }) => {
      return (await doMutation(args)) as { success: boolean };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

/**
 * Update notification preferences for the current user.
 * Connected to Convex: api.domain.notifications.updatePreference
 */
export function useUpdateNotificationPreferences() {
  const mutation = useConvexMutation(api.domain.notifications.updatePreference);

  return {
    mutate: (args: {
      tenantId: Id<"tenants">;
      userId: Id<"users">;
      channel: string;
      category: string;
      enabled: boolean;
    }) => {
      mutation(args);
    },
    mutateAsync: async (args: {
      tenantId: Id<"tenants">;
      userId: Id<"users">;
      channel: string;
      category: string;
      enabled: boolean;
    }) => {
      await mutation(args);
      return { success: true };
    },
    isLoading: false,
    error: null,
    isSuccess: false,
  };
}

/**
 * Send a test push notification to the current user.
 * Uses existing notifications.create facade to create a test notification.
 */
export function useTestPushNotification() {
  const doMutation = useConvexMutation(api.domain.notifications.create);
  const fn = useCallback(
    async (args: { tenantId: string; userId: string }) => {
      await doMutation({
        tenantId: args.tenantId as Id<"tenants">,
        userId: args.userId as Id<"users">,
        type: "push_test",
        title: "Test push notification",
        body: "This is a test push notification from DigilistSaaS.",
      });
      return { success: true };
    },
    [doMutation]
  );
  return useMutationAdapter(fn);
}

/**
 * Combined push subscription flow: request permission, subscribe, register.
 * Browser-side: Notification.requestPermission() then register via backend.
 */
export function usePushSubscriptionFlow() {
  const doRegister = useConvexMutation((api.domain.notifications as any).registerPushSubscription);
  const fn = useCallback(
    async (args: { tenantId: string; userId: string }) => {
      if (typeof window === "undefined" || !("Notification" in window)) {
        return { subscribed: false, permission: "denied" };
      }
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        return { subscribed: false, permission };
      }
      // Register a placeholder subscription (real implementation would use ServiceWorker + PushManager)
      try {
        await doRegister({
          tenantId: args.tenantId,
          userId: args.userId,
          endpoint: `browser-push-${args.userId}-${Date.now()}`,
          p256dh: "",
          auth: "",
          provider: "web",
        });
        return { subscribed: true, permission };
      } catch {
        return { subscribed: false, permission };
      }
    },
    [doRegister]
  );
  return useMutationAdapter(fn);
}
