/* eslint-disable */
/**
 * Generated `ComponentApi` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

/**
 * A utility for referencing a Convex component's exposed API.
 *
 * Useful when expecting a parameter like `components.myComponent`.
 * Usage:
 * ```ts
 * async function myFunction(ctx: QueryCtx, component: ComponentApi) {
 *   return ctx.runQuery(component.someFile.someQuery, { ...args });
 * }
 * ```
 */
export type ComponentApi<Name extends string | undefined = string | undefined> =
  {
    functions: {
      cleanupOld: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs: number; tenantId: string },
        { purged: number },
        Name
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          body?: string;
          link?: string;
          metadata?: any;
          tenantId: string;
          title: string;
          type: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      createEmailTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          category: string;
          channel?: string;
          isActive: boolean;
          isDefault?: boolean;
          metadata?: any;
          modifiedBy?: string;
          name: string;
          subject?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      createFormDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          description?: string;
          fields: Array<{
            id: string;
            label: string;
            options?: Array<string>;
            required: boolean;
            type: string;
          }>;
          isPublished: boolean;
          metadata?: any;
          name: string;
          successMessage?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      deleteEmailTemplate: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      deleteFormDefinition: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      deletePushSubscription: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      getEmailTemplate: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getFormDefinition: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getPreferences: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<any>,
        Name
      >;
      importEmailTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          category: string;
          channel?: string;
          isActive: boolean;
          isDefault?: boolean;
          lastModified?: number;
          metadata?: any;
          modifiedBy?: string;
          name: string;
          sendCount?: number;
          subject?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importFormDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          createdAt?: number;
          description?: string;
          fields: Array<{
            id: string;
            label: string;
            options?: Array<string>;
            required: boolean;
            type: string;
          }>;
          isPublished: boolean;
          lastModified?: number;
          metadata?: any;
          name: string;
          submissionCount?: number;
          successMessage?: string;
          tenantId: string;
        },
        { id: string },
        Name
      >;
      importNotification: FunctionReference<
        "mutation",
        "internal",
        {
          body?: string;
          link?: string;
          metadata?: any;
          readAt?: number;
          tenantId: string;
          title: string;
          type: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      importPreference: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          channel: string;
          enabled: boolean;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      listByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; unreadOnly?: boolean; userId: string },
        Array<any>,
        Name
      >;
      listEmailTemplates: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        Array<any>,
        Name
      >;
      listFormDefinitions: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        Array<any>,
        Name
      >;
      listPushSubscriptions: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<any>,
        Name
      >;
      markAllAsRead: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        { count: number; success: boolean },
        Name
      >;
      markAsRead: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      registerPushSubscription: FunctionReference<
        "mutation",
        "internal",
        {
          auth: string;
          endpoint: string;
          p256dh: string;
          provider?: string;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      sendTestEmail: FunctionReference<
        "mutation",
        "internal",
        { recipientEmail: string; templateId: string },
        { message: string; success: boolean },
        Name
      >;
      unreadCount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { count: number },
        Name
      >;
      unsubscribeAllPush: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        { count: number; success: boolean },
        Name
      >;
      updateEmailTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          body?: string;
          category?: string;
          channel?: string;
          id: string;
          isActive?: boolean;
          isDefault?: boolean;
          metadata?: any;
          modifiedBy?: string;
          name?: string;
          sendCount?: number;
          subject?: string;
        },
        { success: boolean },
        Name
      >;
      updateFormDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          description?: string;
          fields?: Array<{
            id: string;
            label: string;
            options?: Array<string>;
            required: boolean;
            type: string;
          }>;
          id: string;
          isPublished?: boolean;
          metadata?: any;
          name?: string;
          successMessage?: string;
        },
        { success: boolean },
        Name
      >;
      updatePreference: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          channel: string;
          enabled: boolean;
          tenantId: string;
          userId: string;
        },
        { id: string },
        Name
      >;
    };
  };
