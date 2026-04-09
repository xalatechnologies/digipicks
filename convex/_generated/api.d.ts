/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin_cleanup from "../admin/cleanup.js";
import type * as admin_stats from "../admin/stats.js";
import type * as api_routes from "../api/routes.js";
import type * as auth_callback from "../auth/callback.js";
import type * as auth_claims from "../auth/claims.js";
import type * as auth_demoToken from "../auth/demoToken.js";
import type * as auth_emailCode from "../auth/emailCode.js";
import type * as auth_link from "../auth/link.js";
import type * as auth_magicLink from "../auth/magicLink.js";
import type * as auth_oauthStates from "../auth/oauthStates.js";
import type * as auth_password from "../auth/password.js";
import type * as auth_seedTestUsers from "../auth/seedTestUsers.js";
import type * as auth_sessions from "../auth/sessions.js";
import type * as auth_signup from "../auth/signup.js";
import type * as auth_start from "../auth/start.js";
import type * as billing_adyen from "../billing/adyen.js";
import type * as billing_stripe from "../billing/stripe.js";
import type * as billing_stripeConnect from "../billing/stripeConnect.js";
import type * as billing_stripePaymentIntent from "../billing/stripePaymentIntent.js";
import type * as billing_stripeTransfers from "../billing/stripeTransfers.js";
import type * as billing_vipps from "../billing/vipps.js";
import type * as billing_webhooks from "../billing/webhooks.js";
import type * as cronFunctions from "../cronFunctions.js";
import type * as crons from "../crons.js";
import type * as domain_additionalServices from "../domain/additionalServices.js";
import type * as domain_addons from "../domain/addons.js";
import type * as domain_adminPayouts from "../domain/adminPayouts.js";
import type * as domain_analytics from "../domain/analytics.js";
import type * as domain_audit from "../domain/audit.js";
import type * as domain_authSessions from "../domain/authSessions.js";
import type * as domain_billing from "../domain/billing.js";
import type * as domain_broadcasts from "../domain/broadcasts.js";
import type * as domain_classification from "../domain/classification.js";
import type * as domain_compliance from "../domain/compliance.js";
import type * as domain_creatorApplications from "../domain/creatorApplications.js";
import type * as domain_discord from "../domain/discord.js";
import type * as domain_disputes from "../domain/disputes.js";
import type * as domain_emailCampaigns from "../domain/emailCampaigns.js";
import type * as domain_externalReviews from "../domain/externalReviews.js";
import type * as domain_favorites from "../domain/favorites.js";
import type * as domain_gdpr from "../domain/gdpr.js";
import type * as domain_guides from "../domain/guides.js";
import type * as domain_insights from "../domain/insights.js";
import type * as domain_integrationDispatch from "../domain/integrationDispatch.js";
import type * as domain_integrations from "../domain/integrations.js";
import type * as domain_licensing from "../domain/licensing.js";
import type * as domain_listingModeration from "../domain/listingModeration.js";
import type * as domain_listingReports from "../domain/listingReports.js";
import type * as domain_messaging from "../domain/messaging.js";
import type * as domain_messagingNotify from "../domain/messagingNotify.js";
import type * as domain_monitoring from "../domain/monitoring.js";
import type * as domain_notifications from "../domain/notifications.js";
import type * as domain_organizationVerify from "../domain/organizationVerify.js";
import type * as domain_payouts from "../domain/payouts.js";
import type * as domain_picks from "../domain/picks.js";
import type * as domain_platformAdmin from "../domain/platformAdmin.js";
import type * as domain_pricing from "../domain/pricing.js";
import type * as domain_rbacFacade from "../domain/rbacFacade.js";
import type * as domain_reminders from "../domain/reminders.js";
import type * as domain_resources from "../domain/resources.js";
import type * as domain_retention from "../domain/retention.js";
import type * as domain_reviews from "../domain/reviews.js";
import type * as domain_search from "../domain/search.js";
import type * as domain_subscriptions from "../domain/subscriptions.js";
import type * as domain_support from "../domain/support.js";
import type * as domain_tenantConfig from "../domain/tenantConfig.js";
import type * as domain_tenantOnboarding from "../domain/tenantOnboarding.js";
import type * as domain_userLookup from "../domain/userLookup.js";
import type * as domain_verifyApi from "../domain/verifyApi.js";
import type * as domain_webhookSubscriptions from "../domain/webhookSubscriptions.js";
import type * as email_baseLayout from "../email/baseLayout.js";
import type * as email_send from "../email/send.js";
import type * as email_templateRenderer from "../email/templateRenderer.js";
import type * as http from "../http.js";
import type * as integrations_altinn from "../integrations/altinn.js";
import type * as lib_adminEmailTemplates from "../lib/adminEmailTemplates.js";
import type * as lib_auditHelpers from "../lib/auditHelpers.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_batchGet from "../lib/batchGet.js";
import type * as lib_componentContract from "../lib/componentContract.js";
import type * as lib_componentMiddleware from "../lib/componentMiddleware.js";
import type * as lib_crud from "../lib/crud.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emailTemplates from "../lib/emailTemplates.js";
import type * as lib_errorTracking from "../lib/errorTracking.js";
import type * as lib_eventBus from "../lib/eventBus.js";
import type * as lib_featureFlagValidators from "../lib/featureFlagValidators.js";
import type * as lib_featureFlags from "../lib/featureFlags.js";
import type * as lib_formatters from "../lib/formatters.js";
import type * as lib_functions from "../lib/functions.js";
import type * as lib_ical from "../lib/ical.js";
import type * as lib_index from "../lib/index.js";
import type * as lib_openapi from "../lib/openapi.js";
import type * as lib_passwordHash from "../lib/passwordHash.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_retentionDefaults from "../lib/retentionDefaults.js";
import type * as lib_rls from "../lib/rls.js";
import type * as lib_seatAllocation from "../lib/seatAllocation.js";
import type * as lib_ticketCrypto from "../lib/ticketCrypto.js";
import type * as lib_triggers from "../lib/triggers.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messaging_templates from "../messaging/templates.js";
import type * as migrations_promoteResourceMetadata from "../migrations/promoteResourceMetadata.js";
import type * as modules_index from "../modules/index.js";
import type * as ops_platformConfig from "../ops/platformConfig.js";
import type * as organizations_index from "../organizations/index.js";
import type * as sms_gateway from "../sms/gateway.js";
import type * as sms_verify from "../sms/verify.js";
import type * as storage from "../storage.js";
import type * as tenants_index from "../tenants/index.js";
import type * as types from "../types.js";
import type * as users_index from "../users/index.js";
import type * as users_mutations from "../users/mutations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "admin/cleanup": typeof admin_cleanup;
  "admin/stats": typeof admin_stats;
  "api/routes": typeof api_routes;
  "auth/callback": typeof auth_callback;
  "auth/claims": typeof auth_claims;
  "auth/demoToken": typeof auth_demoToken;
  "auth/emailCode": typeof auth_emailCode;
  "auth/link": typeof auth_link;
  "auth/magicLink": typeof auth_magicLink;
  "auth/oauthStates": typeof auth_oauthStates;
  "auth/password": typeof auth_password;
  "auth/seedTestUsers": typeof auth_seedTestUsers;
  "auth/sessions": typeof auth_sessions;
  "auth/signup": typeof auth_signup;
  "auth/start": typeof auth_start;
  "billing/adyen": typeof billing_adyen;
  "billing/stripe": typeof billing_stripe;
  "billing/stripeConnect": typeof billing_stripeConnect;
  "billing/stripePaymentIntent": typeof billing_stripePaymentIntent;
  "billing/stripeTransfers": typeof billing_stripeTransfers;
  "billing/vipps": typeof billing_vipps;
  "billing/webhooks": typeof billing_webhooks;
  cronFunctions: typeof cronFunctions;
  crons: typeof crons;
  "domain/additionalServices": typeof domain_additionalServices;
  "domain/addons": typeof domain_addons;
  "domain/adminPayouts": typeof domain_adminPayouts;
  "domain/analytics": typeof domain_analytics;
  "domain/audit": typeof domain_audit;
  "domain/authSessions": typeof domain_authSessions;
  "domain/billing": typeof domain_billing;
  "domain/broadcasts": typeof domain_broadcasts;
  "domain/classification": typeof domain_classification;
  "domain/compliance": typeof domain_compliance;
  "domain/creatorApplications": typeof domain_creatorApplications;
  "domain/discord": typeof domain_discord;
  "domain/disputes": typeof domain_disputes;
  "domain/emailCampaigns": typeof domain_emailCampaigns;
  "domain/externalReviews": typeof domain_externalReviews;
  "domain/favorites": typeof domain_favorites;
  "domain/gdpr": typeof domain_gdpr;
  "domain/guides": typeof domain_guides;
  "domain/insights": typeof domain_insights;
  "domain/integrationDispatch": typeof domain_integrationDispatch;
  "domain/integrations": typeof domain_integrations;
  "domain/licensing": typeof domain_licensing;
  "domain/listingModeration": typeof domain_listingModeration;
  "domain/listingReports": typeof domain_listingReports;
  "domain/messaging": typeof domain_messaging;
  "domain/messagingNotify": typeof domain_messagingNotify;
  "domain/monitoring": typeof domain_monitoring;
  "domain/notifications": typeof domain_notifications;
  "domain/organizationVerify": typeof domain_organizationVerify;
  "domain/payouts": typeof domain_payouts;
  "domain/picks": typeof domain_picks;
  "domain/platformAdmin": typeof domain_platformAdmin;
  "domain/pricing": typeof domain_pricing;
  "domain/rbacFacade": typeof domain_rbacFacade;
  "domain/reminders": typeof domain_reminders;
  "domain/resources": typeof domain_resources;
  "domain/retention": typeof domain_retention;
  "domain/reviews": typeof domain_reviews;
  "domain/search": typeof domain_search;
  "domain/subscriptions": typeof domain_subscriptions;
  "domain/support": typeof domain_support;
  "domain/tenantConfig": typeof domain_tenantConfig;
  "domain/tenantOnboarding": typeof domain_tenantOnboarding;
  "domain/userLookup": typeof domain_userLookup;
  "domain/verifyApi": typeof domain_verifyApi;
  "domain/webhookSubscriptions": typeof domain_webhookSubscriptions;
  "email/baseLayout": typeof email_baseLayout;
  "email/send": typeof email_send;
  "email/templateRenderer": typeof email_templateRenderer;
  http: typeof http;
  "integrations/altinn": typeof integrations_altinn;
  "lib/adminEmailTemplates": typeof lib_adminEmailTemplates;
  "lib/auditHelpers": typeof lib_auditHelpers;
  "lib/auth": typeof lib_auth;
  "lib/batchGet": typeof lib_batchGet;
  "lib/componentContract": typeof lib_componentContract;
  "lib/componentMiddleware": typeof lib_componentMiddleware;
  "lib/crud": typeof lib_crud;
  "lib/email": typeof lib_email;
  "lib/emailTemplates": typeof lib_emailTemplates;
  "lib/errorTracking": typeof lib_errorTracking;
  "lib/eventBus": typeof lib_eventBus;
  "lib/featureFlagValidators": typeof lib_featureFlagValidators;
  "lib/featureFlags": typeof lib_featureFlags;
  "lib/formatters": typeof lib_formatters;
  "lib/functions": typeof lib_functions;
  "lib/ical": typeof lib_ical;
  "lib/index": typeof lib_index;
  "lib/openapi": typeof lib_openapi;
  "lib/passwordHash": typeof lib_passwordHash;
  "lib/permissions": typeof lib_permissions;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/retentionDefaults": typeof lib_retentionDefaults;
  "lib/rls": typeof lib_rls;
  "lib/seatAllocation": typeof lib_seatAllocation;
  "lib/ticketCrypto": typeof lib_ticketCrypto;
  "lib/triggers": typeof lib_triggers;
  "lib/validators": typeof lib_validators;
  "messaging/templates": typeof messaging_templates;
  "migrations/promoteResourceMetadata": typeof migrations_promoteResourceMetadata;
  "modules/index": typeof modules_index;
  "ops/platformConfig": typeof ops_platformConfig;
  "organizations/index": typeof organizations_index;
  "sms/gateway": typeof sms_gateway;
  "sms/verify": typeof sms_verify;
  storage: typeof storage;
  "tenants/index": typeof tenants_index;
  types: typeof types;
  "users/index": typeof users_index;
  "users/mutations": typeof users_mutations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  audit: {
    functions: {
      cleanupOld: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs: number; tenantId: string },
        { purged: number }
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          changedFields?: Array<string>;
          details?: any;
          entityId: string;
          entityType: string;
          ipAddress?: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          reason?: string;
          sourceComponent?: string;
          tenantId: string;
          userEmail?: string;
          userId?: string;
          userName?: string;
        },
        { id: string }
      >;
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getSummary: FunctionReference<
        "query",
        "internal",
        { periodEnd?: number; periodStart?: number; tenantId: string },
        any
      >;
      importRecord: FunctionReference<
        "mutation",
        "internal",
        {
          action: string;
          entityId: string;
          entityType: string;
          metadata?: any;
          newState?: any;
          previousState?: any;
          reason?: string;
          sourceComponent?: string;
          tenantId: string;
          timestamp: number;
          userId?: string;
        },
        { id: string }
      >;
      listByAction: FunctionReference<
        "query",
        "internal",
        { action: string; limit?: number; tenantId: string },
        Array<any>
      >;
      listByEntity: FunctionReference<
        "query",
        "internal",
        { entityId: string; entityType: string; limit?: number },
        Array<any>
      >;
      listByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<any>
      >;
      listForTenant: FunctionReference<
        "query",
        "internal",
        { entityType?: string; limit?: number; tenantId: string },
        Array<any>
      >;
      listForTenantPaginated: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          entityType?: string;
          pageSize?: number;
          tenantId: string;
        },
        { cursor: string | null; entries: Array<any>; hasMore: boolean }
      >;
    };
    lifecycle: {
      onDisable: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean }
      >;
      onEnable: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean }
      >;
      onInstall: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean }
      >;
      onUninstall: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { success: boolean }
      >;
    };
  };
  reviews: {
    functions: {
      batchStats: FunctionReference<
        "query",
        "internal",
        { resourceIds: Array<string> },
        any
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          rating: number;
          resourceId: string;
          tenantId: string;
          text?: string;
          title?: string;
          userId: string;
        },
        { id: string }
      >;
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getHelpfulCount: FunctionReference<
        "query",
        "internal",
        { reviewId: string },
        number
      >;
      hasVotedHelpful: FunctionReference<
        "query",
        "internal",
        { reviewId: string; userId: string },
        boolean
      >;
      importRecord: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          moderatedAt?: number;
          moderatedBy?: string;
          moderationNote?: string;
          rating: number;
          resourceId: string;
          status: string;
          tenantId: string;
          text?: string;
          title?: string;
          userId: string;
        },
        { id: string }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          resourceId?: string;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
      markHelpful: FunctionReference<
        "mutation",
        "internal",
        { reviewId: string; tenantId: string; userId: string },
        { success: boolean }
      >;
      markUnhelpful: FunctionReference<
        "mutation",
        "internal",
        { reviewId: string; tenantId: string; userId: string },
        { success: boolean }
      >;
      moderate: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          moderatedBy: string;
          moderationNote?: string;
          status: "approved" | "rejected" | "flagged";
        },
        { success: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      stats: FunctionReference<
        "query",
        "internal",
        { resourceId: string },
        {
          averageRating: number;
          distribution: any;
          pending: number;
          total: number;
        }
      >;
      unmarkHelpful: FunctionReference<
        "mutation",
        "internal",
        { reviewId: string; userId: string },
        { success: boolean }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          metadata?: any;
          rating?: number;
          text?: string;
          title?: string;
        },
        { success: boolean }
      >;
    };
  };
  notifications: {
    functions: {
      cleanupOld: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs: number; tenantId: string },
        { purged: number }
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
        { id: string }
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
        { id: string }
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
        { id: string }
      >;
      deleteEmailTemplate: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      deleteFormDefinition: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      deletePushSubscription: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getEmailTemplate: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getFormDefinition: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getPreferences: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<any>
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
        { id: string }
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
        { id: string }
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
        { id: string }
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
        { id: string }
      >;
      listByUser: FunctionReference<
        "query",
        "internal",
        { limit?: number; unreadOnly?: boolean; userId: string },
        Array<any>
      >;
      listEmailTemplates: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        Array<any>
      >;
      listFormDefinitions: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        Array<any>
      >;
      listPushSubscriptions: FunctionReference<
        "query",
        "internal",
        { userId: string },
        Array<any>
      >;
      markAllAsRead: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        { count: number; success: boolean }
      >;
      markAsRead: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
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
        { id: string }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      sendTestEmail: FunctionReference<
        "mutation",
        "internal",
        { recipientEmail: string; templateId: string },
        { message: string; success: boolean }
      >;
      unreadCount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { count: number }
      >;
      unsubscribeAllPush: FunctionReference<
        "mutation",
        "internal",
        { userId: string },
        { count: number; success: boolean }
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
        { success: boolean }
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
        { success: boolean }
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
        { id: string }
      >;
    };
  };
  userPrefs: {
    functions: {
      addFavorite: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          notes?: string;
          resourceId: string;
          tags?: Array<string>;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
      createFilter: FunctionReference<
        "mutation",
        "internal",
        {
          filters: any;
          isDefault?: boolean;
          name: string;
          tenantId: string;
          type: string;
          userId: string;
        },
        { id: string }
      >;
      importFavorite: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          notes?: string;
          resourceId: string;
          tags: Array<string>;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
      importSavedFilter: FunctionReference<
        "mutation",
        "internal",
        {
          filters?: any;
          isDefault?: boolean;
          name: string;
          tenantId: string;
          type: string;
          userId: string;
        },
        { id: string }
      >;
      isFavorite: FunctionReference<
        "query",
        "internal",
        { resourceId: string; userId: string },
        { favorite: any; isFavorite: boolean }
      >;
      listFavorites: FunctionReference<
        "query",
        "internal",
        { tags?: Array<string>; userId: string },
        Array<any>
      >;
      listFilters: FunctionReference<
        "query",
        "internal",
        { type?: string; userId: string },
        Array<any>
      >;
      removeFavorite: FunctionReference<
        "mutation",
        "internal",
        { resourceId: string; userId: string },
        { success: boolean }
      >;
      removeFilter: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      toggleFavorite: FunctionReference<
        "mutation",
        "internal",
        { resourceId: string; tenantId: string; userId: string },
        { isFavorite: boolean }
      >;
      updateFavorite: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: any; notes?: string; tags?: Array<string> },
        { success: boolean }
      >;
      updateFilter: FunctionReference<
        "mutation",
        "internal",
        { filters?: any; id: string; isDefault?: boolean; name?: string },
        { success: boolean }
      >;
    };
  };
  messaging: {
    import: {
      importConversation: FunctionReference<
        "mutation",
        "internal",
        {
          assignedAt?: number;
          assigneeId?: string;
          bookingId?: string;
          conversationType?: "booking" | "general";
          lastMessageAt?: number;
          metadata?: any;
          participants: Array<string>;
          priority?: string;
          reopenedAt?: number;
          resolvedAt?: number;
          resolvedBy?: string;
          resourceId?: string;
          status: string;
          subject?: string;
          tenantId: string;
          unreadCount: number;
          userId: string;
        },
        { id: string }
      >;
      importMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachments: Array<any>;
          content: string;
          conversationId: string;
          messageType: string;
          metadata?: any;
          readAt?: number;
          senderId: string;
          senderType: string;
          sentAt: number;
          tenantId: string;
        },
        { id: string }
      >;
    };
    mutations: {
      addInternalNote: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          conversationId: string;
          metadata?: any;
          senderId: string;
          tenantId: string;
        },
        { id: string }
      >;
      addParticipant: FunctionReference<
        "mutation",
        "internal",
        { id: string; userId: string },
        { success: boolean }
      >;
      archiveConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      assignConversation: FunctionReference<
        "mutation",
        "internal",
        { assigneeId: string; id: string },
        { success: boolean }
      >;
      cleanupOld: FunctionReference<
        "mutation",
        "internal",
        { olderThanMs: number; tenantId: string },
        { purged: number }
      >;
      createConversation: FunctionReference<
        "mutation",
        "internal",
        {
          bookingId?: string;
          conversationType?: "booking" | "general";
          metadata?: any;
          participants: Array<string>;
          resourceId?: string;
          subject?: string;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
      createMessageTemplate: FunctionReference<
        "mutation",
        "internal",
        { body: string; category?: string; name: string; tenantId: string },
        { id: string }
      >;
      getOrCreateConversationForBooking: FunctionReference<
        "mutation",
        "internal",
        {
          bookingId: string;
          resourceId?: string;
          tenantId: string;
          userId: string;
        },
        { conversationId: string }
      >;
      markMessagesAsRead: FunctionReference<
        "mutation",
        "internal",
        { conversationId: string; userId: string },
        { count: number; success: boolean }
      >;
      purgeAllForTenant: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string },
        { conversations: number; messages: number; templates: number }
      >;
      reopenConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      resolveConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string; resolvedBy: string },
        { success: boolean }
      >;
      sendMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachments?: Array<any>;
          content: string;
          conversationId: string;
          messageType?: string;
          metadata?: any;
          senderId: string;
          senderType?: string;
          tenantId: string;
          visibility?: "public" | "internal";
        },
        { id: string }
      >;
      setConversationPriority: FunctionReference<
        "mutation",
        "internal",
        { id: string; priority: string },
        { success: boolean }
      >;
      unassignConversation: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
    };
    queries: {
      getConversation: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getConversationByBooking: FunctionReference<
        "query",
        "internal",
        { bookingId: string; tenantId: string },
        any | null
      >;
      listConversations: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; userId: string },
        Array<any>
      >;
      listConversationsByAssignee: FunctionReference<
        "query",
        "internal",
        { assigneeId: string; limit?: number; status?: string },
        Array<any>
      >;
      listConversationsByTenant: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>
      >;
      listMessages: FunctionReference<
        "query",
        "internal",
        {
          conversationId: string;
          limit?: number;
          visibilityFilter?: "all" | "public";
        },
        Array<any>
      >;
      listMessageTemplates: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; tenantId: string },
        Array<any>
      >;
      unreadMessageCount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        { count: number }
      >;
    };
  };
  analytics: {
    functions: {
      createReportSchedule: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          cronExpression: string;
          description?: string;
          filters?: any;
          format: string;
          metadata?: any;
          name: string;
          recipients: Array<string>;
          reportType: string;
          tenantId: string;
        },
        { id: string }
      >;
      deleteReportSchedule: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      getAvailabilityMetrics: FunctionReference<
        "query",
        "internal",
        { periodEnd: number; periodStart: number; resourceId: string },
        Array<any>
      >;
      getBookingMetrics: FunctionReference<
        "query",
        "internal",
        {
          periodEnd: number;
          periodStart: number;
          resourceId?: string;
          tenantId: string;
        },
        Array<any>
      >;
      importAvailabilityMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          bookedSlots: number;
          calculatedAt: number;
          metadata?: any;
          period: string;
          periodEnd: number;
          periodStart: number;
          popularTimeSlots: Array<any>;
          resourceId: string;
          tenantId: string;
          totalSlots: number;
          utilizationRate: number;
        },
        { id: string }
      >;
      importBookingMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          calculatedAt: number;
          count?: number;
          metadata?: any;
          metricType: string;
          period: string;
          periodEnd: number;
          periodStart: number;
          resourceId?: string;
          tenantId: string;
          value: number;
        },
        { id: string }
      >;
      importReportSchedule: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy: string;
          cronExpression: string;
          description?: string;
          enabled: boolean;
          filters?: any;
          format: string;
          lastRunAt?: number;
          metadata?: any;
          name: string;
          nextRunAt?: number;
          recipients: Array<string>;
          reportType: string;
          tenantId: string;
        },
        { id: string }
      >;
      importScheduledReport: FunctionReference<
        "mutation",
        "internal",
        {
          completedAt?: number;
          error?: string;
          fileSize?: string;
          fileUrl?: string;
          metadata?: any;
          scheduleId: string;
          startedAt?: number;
          status: string;
          tenantId: string;
        },
        { id: string }
      >;
      listReportSchedules: FunctionReference<
        "query",
        "internal",
        { enabled?: boolean; tenantId: string },
        Array<any>
      >;
      storeAvailabilityMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          bookedSlots: number;
          metadata?: any;
          period: string;
          periodEnd: number;
          periodStart: number;
          popularTimeSlots: Array<any>;
          resourceId: string;
          tenantId: string;
          totalSlots: number;
          utilizationRate: number;
        },
        { id: string }
      >;
      storeBookingMetrics: FunctionReference<
        "mutation",
        "internal",
        {
          count?: number;
          metadata?: any;
          metricType: string;
          period: string;
          periodEnd: number;
          periodStart: number;
          resourceId?: string;
          tenantId: string;
          value: number;
        },
        { id: string }
      >;
      updateReportSchedule: FunctionReference<
        "mutation",
        "internal",
        {
          cronExpression?: string;
          description?: string;
          enabled?: boolean;
          filters?: any;
          format?: string;
          id: string;
          metadata?: any;
          name?: string;
          recipients?: Array<string>;
        },
        { success: boolean }
      >;
    };
  };
  compliance: {
    mutations: {
      publishPolicy: FunctionReference<
        "mutation",
        "internal",
        {
          content: string;
          metadata?: any;
          policyType: string;
          publishedBy: string;
          tenantId: string;
          title: string;
          version: string;
        },
        { id: string }
      >;
      rollbackPolicy: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      submitDSAR: FunctionReference<
        "mutation",
        "internal",
        {
          details?: string;
          metadata?: any;
          requestType: string;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
      updateConsent: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          ipAddress?: string;
          isConsented: boolean;
          metadata?: any;
          tenantId: string;
          userAgent?: string;
          userId: string;
          version: string;
        },
        { id: string }
      >;
      updateDSARStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; processedBy: string; responseData?: any; status: string },
        { success: boolean }
      >;
    };
    queries: {
      getConsent: FunctionReference<
        "query",
        "internal",
        { category: string; limit?: number; userId: string },
        any
      >;
      getConsentSummary: FunctionReference<
        "query",
        "internal",
        { userId: string },
        {
          analytics: boolean;
          marketing: boolean;
          necessary: boolean;
          thirdParty: boolean;
        }
      >;
      getDSAR: FunctionReference<"query", "internal", { id: string }, any>;
      getPolicy: FunctionReference<
        "query",
        "internal",
        { policyType: string; tenantId: string },
        any
      >;
      getPolicyHistory: FunctionReference<
        "query",
        "internal",
        { limit?: number; policyType: string; tenantId: string },
        Array<any>
      >;
      listConsent: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        Array<any>
      >;
      listDSARRequests: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string; userId?: string },
        Array<any>
      >;
      listPolicies: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
    };
  };
  tenantConfig: {
    mutations: {
      createFlag: FunctionReference<
        "mutation",
        "internal",
        {
          defaultValue: any;
          description?: string;
          key: string;
          metadata?: any;
          name: string;
          tenantId: string;
          type: string;
        },
        { id: string }
      >;
      createFlagRule: FunctionReference<
        "mutation",
        "internal",
        {
          flagId: string;
          priority: number;
          targetId: string;
          targetType: string;
          tenantId: string;
          value: any;
        },
        { id: string }
      >;
      deleteFlag: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      deleteFlagRule: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeBrandAsset: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeCreatorBrandAsset: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeThemeOverride: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      setThemeOverride: FunctionReference<
        "mutation",
        "internal",
        {
          componentKey: string;
          property: string;
          tenantId: string;
          value: string;
        },
        { id: string }
      >;
      updateBranding: FunctionReference<
        "mutation",
        "internal",
        {
          accentColor?: string;
          borderRadius?: string;
          customCSS?: string;
          darkMode?: boolean;
          fontFamily?: string;
          metadata?: any;
          primaryColor?: string;
          secondaryColor?: string;
          tenantId: string;
        },
        { id: string }
      >;
      updateCreatorBranding: FunctionReference<
        "mutation",
        "internal",
        {
          accentColor?: string;
          borderRadius?: string;
          creatorId: string;
          customCSS?: string;
          customDomain?: string;
          darkMode?: boolean;
          displayName?: string;
          fontFamily?: string;
          metadata?: any;
          primaryColor?: string;
          secondaryColor?: string;
          tagline?: string;
          tenantId: string;
        },
        { id: string }
      >;
      updateFlag: FunctionReference<
        "mutation",
        "internal",
        {
          defaultValue?: any;
          description?: string;
          id: string;
          isActive?: boolean;
          metadata?: any;
          name?: string;
        },
        { success: boolean }
      >;
      uploadBrandAsset: FunctionReference<
        "mutation",
        "internal",
        {
          alt?: string;
          assetType: string;
          metadata?: any;
          storageId?: string;
          tenantId: string;
          url: string;
        },
        { id: string }
      >;
      uploadCreatorBrandAsset: FunctionReference<
        "mutation",
        "internal",
        {
          alt?: string;
          assetType: string;
          creatorId: string;
          metadata?: any;
          storageId?: string;
          tenantId: string;
          url: string;
        },
        { id: string }
      >;
    };
    queries: {
      evaluateAllFlags: FunctionReference<
        "query",
        "internal",
        { targetId?: string; targetType?: string; tenantId: string },
        any
      >;
      evaluateFlag: FunctionReference<
        "query",
        "internal",
        {
          key: string;
          targetId?: string;
          targetType?: string;
          tenantId: string;
        },
        any
      >;
      getBranding: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any
      >;
      getCreatorBranding: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        any
      >;
      getCreatorByCustomDomain: FunctionReference<
        "query",
        "internal",
        { domain: string },
        any
      >;
      getCreatorThemeCSS: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        string
      >;
      getFlag: FunctionReference<
        "query",
        "internal",
        { key: string; tenantId: string },
        any
      >;
      getThemeCSS: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        string
      >;
      listBrandAssets: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
      listCreatorBrandAssets: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<any>
      >;
      listFlags: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
      listThemeOverrides: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
    };
  };
  resources: {
    mutations: {
      adminPatch: FunctionReference<
        "mutation",
        "internal",
        { id: string; patch: any },
        { success: boolean }
      >;
      archive: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      cloneResource: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { id: string; slug: string }
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          ageLimit?: number;
          allowRecurringBooking?: boolean;
          allowSeasonRental?: boolean;
          amenities?: Array<string>;
          areaSquareMeters?: number;
          bookingConfig?: {
            allowRecurring?: boolean;
            allowSeasonalLease?: boolean;
            approvalRequired?: boolean;
            bookingModel?: string;
            bufferAfterMinutes?: number;
            bufferBeforeMinutes?: number;
            cancellationPolicy?: string;
            depositPercent?: number;
            maxAdvanceDays?: number;
            minLeadTimeHours?: number;
            paymentRequired?: boolean;
            slotDurationMinutes?: number;
          };
          capacity?: number;
          capacityDetails?: any;
          categoryKey: string;
          contactEmail?: string;
          contactName?: string;
          contactPhone?: string;
          contactWebsite?: string;
          customSlots?: Array<{
            endTime: string;
            label?: string;
            price?: number;
            startTime: string;
          }>;
          description?: string;
          documents?: Array<{
            description?: string;
            name: string;
            size?: number;
            type?: string;
            url: string;
          }>;
          duration?: number;
          enabledPackageIds?: Array<string>;
          endTime?: string;
          eventDate?: string;
          faq?: Array<{ answer: string; question: string }>;
          floors?: number;
          fullDescription?: string;
          galleryMedia?: Array<any>;
          highlights?: Array<string>;
          images?: Array<any>;
          linkedResourceIds?: Array<string>;
          location?: {
            address?: string;
            city?: string;
            country?: string;
            lat?: number;
            lng?: number;
            municipality?: string;
            postalCode?: string;
          };
          metadata?: any;
          name: string;
          openingHours?: Array<{
            close: string;
            day: string;
            dayIndex: number;
            isClosed?: boolean;
            open: string;
          }>;
          openingHoursExceptions?: Array<{
            close?: string;
            closed?: boolean;
            date: string;
            open?: string;
            reason?: string;
          }>;
          organizationId?: string;
          packagePriceOverrides?: any;
          parkingInfo?: string;
          priceMax?: number;
          pricing?: any;
          pricingDescription?: string;
          pricingRules?: any;
          publishAt?: number;
          recommendedListingIds?: Array<string>;
          requiresApproval?: boolean;
          rules?: Array<{ description?: string; title: string; type?: string }>;
          shows?: Array<any>;
          slotDurationMinutes?: number;
          slug: string;
          socialLinks?: {
            facebook?: string;
            instagram?: string;
            linkedin?: string;
            tiktok?: string;
            twitter?: string;
            youtube?: string;
          };
          startTime?: string;
          status?: string;
          subcategoryKeys?: Array<string>;
          subtitle?: string;
          tags?: Array<string>;
          technicalSpecs?: {
            audio?: string;
            backline?: string;
            haze?: string;
            lighting?: string;
            other?: string;
          };
          tenantId: string;
          ticketProvider?: any;
          ticketTypes?: Array<any>;
          ticketUrl?: string;
          timeMode?: string;
          unpublishAt?: number;
          venueDimensions?: {
            ceilingHeight?: number;
            depthToBackdrop?: number;
            riggingBars?: number;
            stageDepth?: number;
            stageOpening?: number;
            stageWidth?: number;
          };
          venueId?: string;
          venueSlug?: string;
          visibility?: "public" | "unlisted" | "private";
        },
        { id: string }
      >;
      hardDelete: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      importResource: FunctionReference<
        "mutation",
        "internal",
        {
          ageLimit?: number;
          allowRecurringBooking?: boolean;
          allowSeasonRental?: boolean;
          amenities?: Array<string>;
          areaSquareMeters?: number;
          bookingConfig?: {
            allowRecurring?: boolean;
            allowSeasonalLease?: boolean;
            approvalRequired?: boolean;
            bookingModel?: string;
            bufferAfterMinutes?: number;
            bufferBeforeMinutes?: number;
            cancellationPolicy?: string;
            depositPercent?: number;
            maxAdvanceDays?: number;
            minLeadTimeHours?: number;
            paymentRequired?: boolean;
            slotDurationMinutes?: number;
          };
          capacity?: number;
          capacityDetails?: any;
          categoryKey: string;
          contactEmail?: string;
          contactName?: string;
          contactPhone?: string;
          contactWebsite?: string;
          customSlots?: Array<{
            endTime: string;
            label?: string;
            price?: number;
            startTime: string;
          }>;
          description?: string;
          documents?: Array<{
            description?: string;
            name: string;
            size?: number;
            type?: string;
            url: string;
          }>;
          duration?: number;
          enabledPackageIds?: Array<string>;
          endTime?: string;
          eventDate?: string;
          faq?: Array<{ answer: string; question: string }>;
          features: Array<any>;
          floors?: number;
          fullDescription?: string;
          galleryMedia?: Array<any>;
          highlights?: Array<string>;
          images: Array<any>;
          inventoryTotal?: number;
          linkedResourceIds?: Array<string>;
          location?: {
            address?: string;
            city?: string;
            country?: string;
            lat?: number;
            lng?: number;
            municipality?: string;
            postalCode?: string;
          };
          maxBookingDuration?: number;
          metadata: any;
          minBookingDuration?: number;
          name: string;
          openingHours?: Array<any>;
          openingHoursExceptions?: Array<{
            close?: string;
            closed?: boolean;
            date: string;
            open?: string;
            reason?: string;
          }>;
          organizationId?: string;
          packagePriceOverrides?: any;
          parkingInfo?: string;
          priceMax?: number;
          pricing: any;
          pricingDescription?: string;
          pricingRules?: any;
          recommendedListingIds?: Array<string>;
          requiresApproval: boolean;
          ruleSetKey?: string;
          rules?: Array<{ description?: string; title: string; type?: string }>;
          shows?: Array<any>;
          slotDurationMinutes?: number;
          slug: string;
          socialLinks?: {
            facebook?: string;
            instagram?: string;
            linkedin?: string;
            tiktok?: string;
            twitter?: string;
            youtube?: string;
          };
          startTime?: string;
          status: string;
          subcategoryKeys?: Array<string>;
          subtitle?: string;
          tags?: Array<string>;
          technicalSpecs?: {
            audio?: string;
            backline?: string;
            haze?: string;
            lighting?: string;
            other?: string;
          };
          tenantId: string;
          ticketProvider?: any;
          ticketTypes?: Array<any>;
          ticketUrl?: string;
          timeMode: string;
          venueDimensions?: {
            ceilingHeight?: number;
            depthToBackdrop?: number;
            riggingBars?: number;
            stageDepth?: number;
            stageOpening?: number;
            stageWidth?: number;
          };
          venueId?: string;
          venueResourceId?: string;
          venueSlug?: string;
          visibility?: "public" | "unlisted" | "private";
        },
        { id: string }
      >;
      publish: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      reassignTenant: FunctionReference<
        "mutation",
        "internal",
        { id: string; organizationId?: string; tenantId: string },
        { success: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      restore: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      unpublish: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          ageLimit?: number;
          allowRecurringBooking?: boolean;
          allowSeasonRental?: boolean;
          amenities?: Array<string>;
          areaSquareMeters?: number;
          autoApproved?: boolean;
          bookingConfig?: {
            allowRecurring?: boolean;
            allowSeasonalLease?: boolean;
            approvalRequired?: boolean;
            bookingModel?: string;
            bufferAfterMinutes?: number;
            bufferBeforeMinutes?: number;
            cancellationPolicy?: string;
            depositPercent?: number;
            maxAdvanceDays?: number;
            minLeadTimeHours?: number;
            paymentRequired?: boolean;
            slotDurationMinutes?: number;
          };
          capacity?: number;
          capacityDetails?: any;
          categoryKey?: string;
          contactEmail?: string;
          contactName?: string;
          contactPhone?: string;
          contactWebsite?: string;
          customSlots?: Array<{
            endTime: string;
            label?: string;
            price?: number;
            startTime: string;
          }>;
          description?: string;
          documents?: Array<{
            description?: string;
            name: string;
            size?: number;
            type?: string;
            url: string;
          }>;
          duration?: number;
          enabledPackageIds?: Array<string>;
          endTime?: string;
          eventDate?: string;
          expiresAt?: number;
          faq?: Array<{ answer: string; question: string }>;
          features?: Array<any>;
          flaggedAt?: number;
          floors?: number;
          fullDescription?: string;
          galleryMedia?: Array<any>;
          highlights?: Array<string>;
          id: string;
          images?: Array<any>;
          linkedResourceIds?: Array<string>;
          listingStatus?:
            | "draft"
            | "pending_review"
            | "approved"
            | "published"
            | "paused"
            | "sold"
            | "expired"
            | "rejected"
            | "changes_requested"
            | "deleted";
          location?: {
            address?: string;
            city?: string;
            country?: string;
            lat?: number;
            lng?: number;
            municipality?: string;
            postalCode?: string;
          };
          metadata?: any;
          moderatedAt?: number;
          moderatedBy?: string;
          moderationNote?: string;
          name?: string;
          openingHours?: any;
          openingHoursExceptions?: Array<{
            close?: string;
            closed?: boolean;
            date: string;
            open?: string;
            reason?: string;
          }>;
          ownerId?: string;
          packagePriceOverrides?: any;
          parkingInfo?: string;
          priceMax?: number;
          pricing?: any;
          pricingDescription?: string;
          pricingRules?: any;
          publishAt?: number;
          publishedAt?: number;
          recommendedListingIds?: Array<string>;
          renewCount?: number;
          renewedAt?: number;
          reportCount?: number;
          requiresApproval?: boolean;
          riskLevel?: "low" | "medium" | "high";
          rules?: Array<{ description?: string; title: string; type?: string }>;
          shows?: Array<any>;
          slotDurationMinutes?: number;
          socialLinks?: {
            facebook?: string;
            instagram?: string;
            linkedin?: string;
            tiktok?: string;
            twitter?: string;
            youtube?: string;
          };
          startTime?: string;
          status?: string;
          subcategoryKeys?: Array<string>;
          submittedForReviewAt?: number;
          subtitle?: string;
          tags?: Array<string>;
          technicalSpecs?: {
            audio?: string;
            backline?: string;
            haze?: string;
            lighting?: string;
            other?: string;
          };
          ticketProvider?: any;
          ticketTypes?: Array<any>;
          ticketUrl?: string;
          timeMode?: string;
          unpublishAt?: number;
          venueBookingId?: string;
          venueDimensions?: {
            ceilingHeight?: number;
            depthToBackdrop?: number;
            riggingBars?: number;
            stageDepth?: number;
            stageOpening?: number;
            stageWidth?: number;
          };
          venueId?: string;
          venueResourceId?: string;
          venueSlug?: string;
          visibility?: "public" | "unlisted" | "private";
        },
        { success: boolean }
      >;
    };
    queries: {
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any
      >;
      getBySlugPublic: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId?: string },
        any
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          categoryKey?: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listAll: FunctionReference<
        "query",
        "internal",
        {
          categoryKey?: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listByVenueSlug: FunctionReference<
        "query",
        "internal",
        { tenantId: string; venueSlug: string },
        Array<any>
      >;
      listPlatform: FunctionReference<
        "query",
        "internal",
        { categoryKey?: string; limit?: number; status?: string },
        Array<any>
      >;
      listPublic: FunctionReference<
        "query",
        "internal",
        {
          categoryKey?: string;
          limit?: number;
          status?: string;
          tenantId?: string;
        },
        Array<any>
      >;
      scanAll: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<any>
      >;
    };
  };
  pricing: {
    calculations: {
      calculatePrice: FunctionReference<
        "query",
        "internal",
        {
          additionalServiceIds?: Array<string>;
          endTime: number;
          organizationId?: string;
          resourceId: string;
          startTime: number;
          userId?: string;
        },
        any
      >;
      calculatePriceWithBreakdown: FunctionReference<
        "query",
        "internal",
        {
          attendees: number;
          bookingDate?: number;
          bookingMode: string;
          bookingTime?: string;
          discountCode?: string;
          durationMinutes: number;
          organizationId?: string;
          priceGroupId?: string;
          resourceCategoryKey?: string;
          resourceId: string;
          selectedSlotMinutes?: number;
          tenantId: string;
          tickets?: number;
          userId?: string;
        },
        any
      >;
    };
    discounts: {
      applyDiscountCode: FunctionReference<
        "mutation",
        "internal",
        {
          bookingId?: string;
          discountAmount: number;
          discountCodeId: string;
          tenantId: string;
          userId: string;
        },
        { id: string; success: boolean }
      >;
      createDiscountCode: FunctionReference<
        "mutation",
        "internal",
        {
          appliesToBookingModes?: Array<string>;
          appliesToCategories?: Array<string>;
          appliesToResources?: Array<string>;
          code: string;
          description?: string;
          discountType: "percent" | "fixed" | "free_hours";
          discountValue: number;
          firstTimeBookersOnly?: boolean;
          maxDiscountAmount?: number;
          maxUsesPerUser?: number;
          maxUsesTotal?: number;
          metadata?: any;
          minBookingAmount?: number;
          minDurationMinutes?: number;
          name: string;
          restrictToOrgs?: Array<string>;
          restrictToPriceGroups?: Array<string>;
          restrictToUsers?: Array<string>;
          tenantId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      deleteDiscountCode: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      getDiscountCode: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      listDiscountCodes: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; tenantId: string },
        Array<any>
      >;
      updateDiscountCode: FunctionReference<
        "mutation",
        "internal",
        {
          appliesToBookingModes?: Array<string>;
          appliesToCategories?: Array<string>;
          appliesToResources?: Array<string>;
          description?: string;
          discountType?: "percent" | "fixed" | "free_hours";
          discountValue?: number;
          firstTimeBookersOnly?: boolean;
          id: string;
          isActive?: boolean;
          maxDiscountAmount?: number;
          maxUsesPerUser?: number;
          maxUsesTotal?: number;
          metadata?: any;
          minBookingAmount?: number;
          minDurationMinutes?: number;
          name?: string;
          restrictToOrgs?: Array<string>;
          restrictToPriceGroups?: Array<string>;
          restrictToUsers?: Array<string>;
          validFrom?: number;
          validUntil?: number;
        },
        { success: boolean }
      >;
      validateDiscountCode: FunctionReference<
        "query",
        "internal",
        {
          bookingAmount?: number;
          bookingMode?: string;
          categoryKey?: string;
          code: string;
          durationMinutes?: number;
          isFirstTimeBooker?: boolean;
          organizationId?: string;
          priceGroupId?: string;
          resourceId?: string;
          tenantId: string;
          userId?: string;
        },
        any
      >;
    };
    holidays: {
      createHoliday: FunctionReference<
        "mutation",
        "internal",
        {
          appliesToCategories?: Array<string>;
          appliesToResources?: Array<string>;
          date: string;
          dateTo?: string;
          endTime?: string;
          isRecurring: boolean;
          metadata?: any;
          name: string;
          startTime?: string;
          surchargeType: "percent" | "fixed" | "multiplier";
          surchargeValue: number;
          tenantId: string;
        },
        { id: string }
      >;
      deleteHoliday: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      getHoliday: FunctionReference<"query", "internal", { id: string }, any>;
      listHolidays: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; tenantId: string },
        Array<any>
      >;
      updateHoliday: FunctionReference<
        "mutation",
        "internal",
        {
          appliesToCategories?: Array<string>;
          appliesToResources?: Array<string>;
          date?: string;
          dateTo?: string;
          endTime?: string;
          id: string;
          isActive?: boolean;
          isRecurring?: boolean;
          metadata?: any;
          name?: string;
          startTime?: string;
          surchargeType?: "percent" | "fixed" | "multiplier";
          surchargeValue?: number;
        },
        { success: boolean }
      >;
    };
    import: {
      importAdditionalService: FunctionReference<
        "mutation",
        "internal",
        {
          currency?: string;
          description?: string;
          displayOrder?: number;
          isActive: boolean;
          isRequired?: boolean;
          metadata?: any;
          name: string;
          price: number;
          resourceId: string;
          tenantId: string;
        },
        { id: string }
      >;
      importDiscountCode: FunctionReference<
        "mutation",
        "internal",
        {
          appliesToBookingModes?: Array<string>;
          appliesToCategories?: Array<string>;
          appliesToResources?: Array<string>;
          code: string;
          currentUses: number;
          description?: string;
          discountType: "percent" | "fixed" | "free_hours";
          discountValue: number;
          firstTimeBookersOnly?: boolean;
          isActive: boolean;
          maxDiscountAmount?: number;
          maxUsesPerUser?: number;
          maxUsesTotal?: number;
          metadata?: any;
          minBookingAmount?: number;
          minDurationMinutes?: number;
          name: string;
          restrictToOrgs?: Array<string>;
          restrictToPriceGroups?: Array<string>;
          restrictToUsers?: Array<string>;
          tenantId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      importDiscountCodeUsage: FunctionReference<
        "mutation",
        "internal",
        {
          bookingId?: string;
          discountAmount: number;
          discountCodeId: string;
          tenantId: string;
          usedAt: number;
          userId: string;
        },
        { id: string }
      >;
      importHoliday: FunctionReference<
        "mutation",
        "internal",
        {
          appliesToCategories?: Array<string>;
          appliesToResources?: Array<string>;
          date: string;
          isActive: boolean;
          isRecurring: boolean;
          metadata?: any;
          name: string;
          surchargeType: "percent" | "fixed" | "multiplier";
          surchargeValue: number;
          tenantId: string;
        },
        { id: string }
      >;
      importOrgPricingGroup: FunctionReference<
        "mutation",
        "internal",
        {
          discountPercent?: number;
          isActive: boolean;
          metadata?: any;
          organizationId: string;
          pricingGroupId: string;
          tenantId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      importPricingGroup: FunctionReference<
        "mutation",
        "internal",
        {
          applicableBookingModes?: Array<string>;
          description?: string;
          discountAmount?: number;
          discountPercent?: number;
          groupType?: string;
          isActive: boolean;
          isDefault: boolean;
          metadata?: any;
          name: string;
          priority: number;
          tenantId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      importResourcePricing: FunctionReference<
        "mutation",
        "internal",
        {
          advanceBookingDays?: number;
          applicableBookingModes?: Array<string>;
          basePrice: number;
          cancellationHours?: number;
          cleaningFee?: number;
          currency: string;
          depositAmount?: number;
          enableDiscountCodes?: boolean;
          enablePriceGroups?: boolean;
          enableSurcharges?: boolean;
          holidayMultiplier?: number;
          isActive: boolean;
          maxAge?: number;
          maxDuration?: number;
          maxPeople?: number;
          metadata?: any;
          minAge?: number;
          minDuration?: number;
          minPeople?: number;
          peakHoursMultiplier?: number;
          pricePerDay?: number;
          pricePerHalfDay?: number;
          pricePerHour?: number;
          pricePerPerson?: number;
          pricePerPersonHour?: number;
          priceType: string;
          pricingGroupId?: string;
          resourceId: string;
          rules?: any;
          sameDayBookingAllowed?: boolean;
          serviceFee?: number;
          slotDurationMinutes?: number;
          slotOptions?: Array<any>;
          taxIncluded?: boolean;
          taxRate?: number;
          tenantId: string;
          weekendMultiplier?: number;
        },
        { id: string }
      >;
      importTicketTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          displayOrder?: number;
          isActive: boolean;
          maxPerPurchase?: number;
          metadata?: any;
          name: string;
          price: number;
          tenantId: string;
        },
        { id: string }
      >;
      importUserPricingGroup: FunctionReference<
        "mutation",
        "internal",
        {
          isActive: boolean;
          metadata?: any;
          pricingGroupId: string;
          tenantId: string;
          userId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      importWeekdayPricing: FunctionReference<
        "mutation",
        "internal",
        {
          dayOfWeek: number;
          endTime?: string;
          isActive: boolean;
          label?: string;
          metadata?: any;
          resourceId?: string;
          startTime?: string;
          surchargeType: "percent" | "fixed" | "multiplier";
          surchargeValue: number;
          tenantId: string;
        },
        { id: string }
      >;
    };
    mutations: {
      assignOrgPricingGroup: FunctionReference<
        "mutation",
        "internal",
        {
          discountPercent?: number;
          metadata?: any;
          organizationId: string;
          pricingGroupId: string;
          tenantId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      assignUserPricingGroup: FunctionReference<
        "mutation",
        "internal",
        {
          metadata?: any;
          pricingGroupId: string;
          tenantId: string;
          userId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          advanceBookingDays?: number;
          applicableBookingModes?: Array<string>;
          basePrice: number;
          cancellationHours?: number;
          cleaningFee?: number;
          currency: string;
          depositAmount?: number;
          enableDiscountCodes?: boolean;
          enablePriceGroups?: boolean;
          enableSurcharges?: boolean;
          holidayMultiplier?: number;
          maxAge?: number;
          maxDuration?: number;
          maxPeople?: number;
          metadata?: any;
          minAge?: number;
          minDuration?: number;
          minPeople?: number;
          peakHoursMultiplier?: number;
          pricePerDay?: number;
          pricePerHalfDay?: number;
          pricePerHour?: number;
          pricePerPerson?: number;
          pricePerPersonHour?: number;
          priceType: string;
          pricingGroupId?: string;
          resourceId: string;
          rules?: any;
          sameDayBookingAllowed?: boolean;
          serviceFee?: number;
          slotDurationMinutes?: number;
          slotOptions?: Array<any>;
          taxIncluded?: boolean;
          taxRate?: number;
          tenantId: string;
          weekendMultiplier?: number;
        },
        { id: string }
      >;
      createAdditionalService: FunctionReference<
        "mutation",
        "internal",
        {
          currency?: string;
          description?: string;
          displayOrder?: number;
          isRequired?: boolean;
          metadata?: any;
          name: string;
          price: number;
          resourceId: string;
          tenantId: string;
        },
        { id: string }
      >;
      createGroup: FunctionReference<
        "mutation",
        "internal",
        {
          applicableBookingModes?: Array<string>;
          description?: string;
          discountAmount?: number;
          discountPercent?: number;
          groupType?: string;
          isDefault?: boolean;
          metadata?: any;
          name: string;
          priority?: number;
          tenantId: string;
          validFrom?: number;
          validUntil?: number;
        },
        { id: string }
      >;
      createPackage: FunctionReference<
        "mutation",
        "internal",
        {
          currency?: string;
          description?: string;
          displayOrder: number;
          includedAddonIds?: Array<string>;
          includedItems?: Array<string>;
          includedServiceIds?: Array<string>;
          isActive: boolean;
          isPublic: boolean;
          isRecommended?: boolean;
          name: string;
          price: number;
          suitableFor?: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      createTicketTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          displayOrder?: number;
          maxPerPurchase?: number;
          metadata?: any;
          name: string;
          price: number;
          tenantId: string;
        },
        { id: string }
      >;
      deletePackage: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeAdditionalService: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeGroup: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeOrgPricingGroup: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeTicketTemplate: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeUserPricingGroup: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          advanceBookingDays?: number;
          applicableBookingModes?: Array<string>;
          basePrice?: number;
          cancellationHours?: number;
          cleaningFee?: number;
          currency?: string;
          depositAmount?: number;
          enableDiscountCodes?: boolean;
          enablePriceGroups?: boolean;
          enableSurcharges?: boolean;
          holidayMultiplier?: number;
          id: string;
          isActive?: boolean;
          maxAge?: number;
          maxDuration?: number;
          maxPeople?: number;
          metadata?: any;
          minAge?: number;
          minDuration?: number;
          minPeople?: number;
          peakHoursMultiplier?: number;
          pricePerDay?: number;
          pricePerHalfDay?: number;
          pricePerHour?: number;
          pricePerPerson?: number;
          pricePerPersonHour?: number;
          priceType?: string;
          pricingGroupId?: string;
          rules?: any;
          sameDayBookingAllowed?: boolean;
          serviceFee?: number;
          slotDurationMinutes?: number;
          slotOptions?: Array<any>;
          taxIncluded?: boolean;
          taxRate?: number;
          weekendMultiplier?: number;
        },
        { success: boolean }
      >;
      updateAdditionalService: FunctionReference<
        "mutation",
        "internal",
        {
          currency?: string;
          description?: string;
          displayOrder?: number;
          id: string;
          isActive?: boolean;
          isRequired?: boolean;
          metadata?: any;
          name?: string;
          price?: number;
        },
        { success: boolean }
      >;
      updateGroup: FunctionReference<
        "mutation",
        "internal",
        {
          applicableBookingModes?: Array<string>;
          description?: string;
          discountAmount?: number;
          discountPercent?: number;
          groupType?: string;
          id: string;
          isActive?: boolean;
          isDefault?: boolean;
          metadata?: any;
          name?: string;
          priority?: number;
          validFrom?: number;
          validUntil?: number;
        },
        { success: boolean }
      >;
      updatePackage: FunctionReference<
        "mutation",
        "internal",
        {
          currency?: string;
          description?: string;
          displayOrder?: number;
          id: string;
          includedAddonIds?: Array<string>;
          includedItems?: Array<string>;
          includedServiceIds?: Array<string>;
          isActive?: boolean;
          isPublic?: boolean;
          isRecommended?: boolean;
          name?: string;
          price?: number;
          suitableFor?: Array<string>;
        },
        { success: boolean }
      >;
      updateTicketTemplate: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          displayOrder?: number;
          id: string;
          isActive?: boolean;
          maxPerPurchase?: number;
          metadata?: any;
          name?: string;
          price?: number;
        },
        { success: boolean }
      >;
    };
    queries: {
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getAdditionalService: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getAdditionalServicesByIds: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<any>
      >;
      getGroup: FunctionReference<"query", "internal", { id: string }, any>;
      getOrgPricingGroup: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getPackage: FunctionReference<"query", "internal", { id: string }, any>;
      getResourcePriceGroups: FunctionReference<
        "query",
        "internal",
        { bookingMode?: string; resourceId: string; tenantId: string },
        Array<any>
      >;
      getResourcePricingConfig: FunctionReference<
        "query",
        "internal",
        { bookingMode?: string; resourceId: string },
        any
      >;
      getTicketTemplate: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getUserPricingGroup: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      listAdditionalServices: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; resourceId: string },
        Array<any>
      >;
      listAdditionalServicesByTenant: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>
      >;
      listByTenant: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>
      >;
      listForResource: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; resourceId: string },
        Array<any>
      >;
      listGroups: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>
      >;
      listOrgPricingGroups: FunctionReference<
        "query",
        "internal",
        {
          isActive?: boolean;
          limit?: number;
          organizationId?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listPackages: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; isPublic?: boolean; tenantId: string },
        Array<any>
      >;
      listTicketTemplates: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>
      >;
      listUserPricingGroups: FunctionReference<
        "query",
        "internal",
        {
          isActive?: boolean;
          limit?: number;
          tenantId: string;
          userId?: string;
        },
        Array<any>
      >;
    };
    surcharges: {
      createWeekdayPricing: FunctionReference<
        "mutation",
        "internal",
        {
          dayOfWeek: number;
          endTime?: string;
          label?: string;
          metadata?: any;
          resourceId?: string;
          startTime?: string;
          surchargeType: "percent" | "fixed" | "multiplier";
          surchargeValue: number;
          tenantId: string;
        },
        { id: string }
      >;
      deleteWeekdayPricing: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      getApplicableSurcharges: FunctionReference<
        "query",
        "internal",
        {
          bookingDate: number;
          bookingTime?: string;
          resourceCategoryKey?: string;
          resourceId: string;
          tenantId: string;
        },
        Array<any>
      >;
      getWeekdayPricingRule: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      listWeekdayPricing: FunctionReference<
        "query",
        "internal",
        {
          dayOfWeek?: number;
          isActive?: boolean;
          resourceId?: string;
          tenantId: string;
        },
        Array<any>
      >;
      updateWeekdayPricing: FunctionReference<
        "mutation",
        "internal",
        {
          dayOfWeek?: number;
          endTime?: string;
          id: string;
          isActive?: boolean;
          label?: string;
          metadata?: any;
          startTime?: string;
          surchargeType?: "percent" | "fixed" | "multiplier";
          surchargeValue?: number;
        },
        { success: boolean }
      >;
    };
  };
  addons: {
    import: {
      importAddon: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          currency: string;
          description?: string;
          displayOrder: number;
          icon?: string;
          images: Array<any>;
          isActive: boolean;
          leadTimeHours?: number;
          maxQuantity?: number;
          metadata?: any;
          name: string;
          price: number;
          priceType: string;
          requiresApproval: boolean;
          slug: string;
          tenantId: string;
        },
        { id: string }
      >;
      importBookingAddon: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          bookingId: string;
          currency: string;
          metadata?: any;
          notes?: string;
          quantity: number;
          status: string;
          tenantId: string;
          totalPrice: number;
          unitPrice: number;
        },
        { id: string }
      >;
      importResourceAddon: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          customPrice?: number;
          displayOrder: number;
          isActive: boolean;
          isRecommended: boolean;
          isRequired: boolean;
          metadata?: any;
          resourceId: string;
          tenantId: string;
        },
        { id: string }
      >;
    };
    mutations: {
      addToBooking: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          bookingId: string;
          metadata?: any;
          notes?: string;
          quantity: number;
          tenantId: string;
        },
        { id: string }
      >;
      addToResource: FunctionReference<
        "mutation",
        "internal",
        {
          addonId: string;
          customPrice?: number;
          displayOrder?: number;
          isRecommended?: boolean;
          isRequired?: boolean;
          metadata?: any;
          resourceId: string;
          tenantId: string;
        },
        { id: string }
      >;
      approve: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          currency: string;
          description?: string;
          displayOrder?: number;
          icon?: string;
          images?: Array<any>;
          leadTimeHours?: number;
          maxQuantity?: number;
          metadata?: any;
          name: string;
          price: number;
          priceType: string;
          requiresApproval?: boolean;
          slug: string;
          tenantId: string;
        },
        { id: string }
      >;
      reject: FunctionReference<
        "mutation",
        "internal",
        { id: string; reason?: string },
        { success: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeFromBooking: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removeFromResource: FunctionReference<
        "mutation",
        "internal",
        { addonId: string; resourceId: string },
        { success: boolean }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          currency?: string;
          description?: string;
          displayOrder?: number;
          icon?: string;
          id: string;
          images?: Array<any>;
          isActive?: boolean;
          leadTimeHours?: number;
          maxQuantity?: number;
          metadata?: any;
          name?: string;
          price?: number;
          priceType?: string;
          requiresApproval?: boolean;
        },
        { success: boolean }
      >;
      updateBookingAddon: FunctionReference<
        "mutation",
        "internal",
        { id: string; metadata?: any; notes?: string; quantity?: number },
        { success: boolean }
      >;
    };
    queries: {
      get: FunctionReference<"query", "internal", { id: string }, any>;
      list: FunctionReference<
        "query",
        "internal",
        {
          category?: string;
          isActive?: boolean;
          limit?: number;
          tenantId: string;
        },
        Array<any>
      >;
      listForBooking: FunctionReference<
        "query",
        "internal",
        { bookingId: string; limit?: number },
        Array<any>
      >;
      listForResource: FunctionReference<
        "query",
        "internal",
        { limit?: number; resourceId: string },
        Array<any>
      >;
    };
  };
  auth: {
    mutations: {
      cleanupExpired: FunctionReference<
        "mutation",
        "internal",
        {},
        {
          magicLinks: number;
          oauthStates: number;
          sessions: number;
          verifications: number;
        }
      >;
      consumeMagicLink: FunctionReference<
        "mutation",
        "internal",
        { token: string },
        any
      >;
      consumeOAuthState: FunctionReference<
        "mutation",
        "internal",
        { state: string },
        any
      >;
      createDemoToken: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: number;
          key: string;
          organizationId?: string;
          tenantId: string;
          tokenHash: string;
          userId: string;
        },
        { id: string }
      >;
      createMagicLink: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          email: string;
          expiresAt: number;
          returnPath: string;
          token: string;
        },
        { id: string }
      >;
      createOAuthState: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          expiresAt: number;
          provider: string;
          returnPath: string;
          signicatSessionId?: string;
          state: string;
        },
        { id: string }
      >;
      createSession: FunctionReference<
        "mutation",
        "internal",
        {
          appId?: string;
          expiresAt: number;
          provider: string;
          token: string;
          userId: string;
        },
        { id: string }
      >;
      createVerification: FunctionReference<
        "mutation",
        "internal",
        {
          channel: string;
          expiresAt: number;
          maxAttempts?: number;
          purpose: string;
          target: string;
          userId?: string;
        },
        { id: string }
      >;
      importDemoToken: FunctionReference<
        "mutation",
        "internal",
        {
          expiresAt?: number;
          isActive: boolean;
          key: string;
          organizationId?: string;
          tenantId: string;
          tokenHash: string;
          userId: string;
        },
        { id: string }
      >;
      importMagicLink: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          consumed: boolean;
          consumedAt?: number;
          createdAt: number;
          email: string;
          expiresAt: number;
          returnPath: string;
          token: string;
        },
        { id: string }
      >;
      importOAuthState: FunctionReference<
        "mutation",
        "internal",
        {
          appId: string;
          appOrigin: string;
          consumed: boolean;
          createdAt: number;
          expiresAt: number;
          provider: string;
          returnPath: string;
          signicatSessionId?: string;
          state: string;
        },
        { id: string }
      >;
      importSession: FunctionReference<
        "mutation",
        "internal",
        {
          appId?: string;
          expiresAt: number;
          isActive: boolean;
          lastActiveAt: number;
          provider: string;
          token: string;
          userId: string;
        },
        { id: string }
      >;
      invalidateSession: FunctionReference<
        "mutation",
        "internal",
        { token: string },
        { success: boolean }
      >;
      touchSession: FunctionReference<
        "mutation",
        "internal",
        { sessionId: string },
        { success: boolean }
      >;
      updateVerification: FunctionReference<
        "mutation",
        "internal",
        { id: string; incrementAttempts?: boolean; status?: string },
        { exceeded?: boolean; success: boolean }
      >;
    };
    queries: {
      getSessionByToken: FunctionReference<
        "query",
        "internal",
        { token: string },
        any
      >;
      listSessionsByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      validateDemoToken: FunctionReference<
        "query",
        "internal",
        { key: string },
        any
      >;
      validateSession: FunctionReference<
        "query",
        "internal",
        { token: string },
        any
      >;
    };
  };
  rbac: {
    import: {
      importRole: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          isDefault: boolean;
          isSystem: boolean;
          name: string;
          permissions: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      importUserRole: FunctionReference<
        "mutation",
        "internal",
        {
          assignedAt: number;
          roleId: string;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
    };
    mutations: {
      assignRole: FunctionReference<
        "mutation",
        "internal",
        { roleId: string; tenantId: string; userId: string },
        { id: string }
      >;
      createRole: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          isDefault?: boolean;
          isSystem?: boolean;
          name: string;
          permissions: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      deleteRole: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      revokeRole: FunctionReference<
        "mutation",
        "internal",
        { roleId: string; tenantId: string; userId: string },
        { success: boolean }
      >;
      updateRole: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          id: string;
          isDefault?: boolean;
          name?: string;
          permissions?: Array<string>;
        },
        { success: boolean }
      >;
    };
    queries: {
      checkPermission: FunctionReference<
        "query",
        "internal",
        { permission: string; tenantId: string; userId: string },
        { hasPermission: boolean }
      >;
      getRole: FunctionReference<"query", "internal", { id: string }, any>;
      getUserPermissions: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        { permissions: Array<string> }
      >;
      listRoles: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
      listUserRoles: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId?: string; userId?: string },
        Array<any>
      >;
    };
  };
  billing: {
    import: {
      importInvoice: FunctionReference<
        "mutation",
        "internal",
        {
          billingAddress?: {
            city?: string;
            country?: string;
            postalCode?: string;
            street?: string;
          };
          bookingIds?: Array<string>;
          createdAt: number;
          createdBy?: string;
          currency: string;
          customerAddress?: string;
          customerEmail?: string;
          customerName: string;
          customerOrgNumber?: string;
          dueDate: number;
          internalNotes?: string;
          invoiceNumber: string;
          issueDate: number;
          lineItems: Array<{
            amount: number;
            bookingId?: string;
            description: string;
            id: string;
            quantity: number;
            resourceId?: string;
            taxAmount?: number;
            taxRate?: number;
            unitPrice: number;
          }>;
          metadata?: any;
          notes?: string;
          organizationId?: string;
          paidDate?: number;
          paymentId?: string;
          paymentMethod?: string;
          pdfStorageId?: string;
          reference?: string;
          status: string;
          subtotal: number;
          taxAmount: number;
          tenantId: string;
          totalAmount: number;
          updatedAt: number;
          userId?: string;
        },
        { id: string }
      >;
      importPayment: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          bookingId?: string;
          capturedAmount?: number;
          createdAt: number;
          currency: string;
          description?: string;
          externalId?: string;
          metadata?: any;
          provider: string;
          redirectUrl?: string;
          reference: string;
          refundedAmount?: number;
          status: string;
          tenantId: string;
          updatedAt: number;
          userId?: string;
        },
        { id: string }
      >;
    };
    mutations: {
      approveCreditNote: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      approveInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      createCreditNote: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy?: string;
          fullCredit?: boolean;
          lineItems?: Array<{
            description: string;
            quantity: number;
            unitPrice: number;
            vatRate?: number;
          }>;
          reason: string;
          salesDocumentId: string;
          tenantId: string;
        },
        { creditNoteNumber: string; id: string }
      >;
      createInvoice: FunctionReference<
        "mutation",
        "internal",
        {
          bookingIds?: Array<string>;
          createdBy?: string;
          customerAddress?: string;
          customerEmail?: string;
          customerName: string;
          customerOrgNumber?: string;
          dueDate: number;
          lineItems: Array<{
            amount: number;
            bookingId?: string;
            description: string;
            id: string;
            quantity: number;
            resourceId?: string;
            taxAmount?: number;
            taxRate?: number;
            unitPrice: number;
          }>;
          notes?: string;
          organizationId?: string;
          tenantId: string;
          userId?: string;
        },
        { id: string; invoiceNumber: string }
      >;
      createInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        {
          createdBy?: string;
          customerId: string;
          dueDate: number;
          lineItems: Array<{
            bookingId?: string;
            description: string;
            quantity: number;
            resourceId?: string;
            unitPrice: number;
            vatRate?: number;
          }>;
          metadata?: any;
          notes?: string;
          tenantId: string;
        },
        { id: string }
      >;
      createPayment: FunctionReference<
        "mutation",
        "internal",
        {
          amount: number;
          bookingId?: string;
          currency: string;
          description?: string;
          metadata?: any;
          provider: string;
          reference: string;
          tenantId: string;
          userId?: string;
        },
        { id: string }
      >;
      creditInvoice: FunctionReference<
        "mutation",
        "internal",
        { id: string; reason?: string },
        { success: boolean }
      >;
      deleteInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      finalizeInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        { id: string; sendToCustomer?: boolean },
        { salesDocumentId: string; success: boolean }
      >;
      markInvoicePaid: FunctionReference<
        "mutation",
        "internal",
        { id: string; paymentId?: string; paymentMethod?: string },
        { success: boolean }
      >;
      patchInvoiceUserId: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string; userId: string },
        { patched: number }
      >;
      processCreditNote: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      sendInvoice: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      storeInvoicePdf: FunctionReference<
        "mutation",
        "internal",
        { id: string; storageId: string },
        { success: boolean }
      >;
      updateInvoiceBasis: FunctionReference<
        "mutation",
        "internal",
        {
          dueDate?: number;
          id: string;
          lineItems?: Array<{
            bookingId?: string;
            description: string;
            quantity: number;
            resourceId?: string;
            unitPrice: number;
            vatRate?: number;
          }>;
          metadata?: any;
          notes?: string;
        },
        { success: boolean }
      >;
      updateInvoiceStatus: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          paidDate?: number;
          paymentId?: string;
          paymentMethod?: string;
          status: string;
        },
        { success: boolean }
      >;
      updatePaymentStatus: FunctionReference<
        "mutation",
        "internal",
        {
          capturedAmount?: number;
          externalId?: string;
          id: string;
          refundedAmount?: number;
          status:
            | "created"
            | "authorized"
            | "captured"
            | "failed"
            | "refunded"
            | "partially_refunded"
            | "cancelled";
        },
        { success: boolean }
      >;
    };
    queries: {
      getByReference: FunctionReference<
        "query",
        "internal",
        { reference: string; tenantId: string },
        any
      >;
      getByReferenceGlobal: FunctionReference<
        "query",
        "internal",
        { reference: string },
        any
      >;
      getCreditNote: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getEconomyStats: FunctionReference<
        "query",
        "internal",
        { period?: string; tenantId: string },
        any
      >;
      getInvoice: FunctionReference<"query", "internal", { id: string }, any>;
      getInvoiceBasis: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getInvoiceDownloadUrl: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getOrgBillingSummary: FunctionReference<
        "query",
        "internal",
        { organizationId: string; period?: string },
        any
      >;
      getPayment: FunctionReference<"query", "internal", { id: string }, any>;
      getSummary: FunctionReference<
        "query",
        "internal",
        { limit?: number; period?: string; userId: string },
        any
      >;
      listCreditNotes: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>
      >;
      listInvoiceBases: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>
      >;
      listInvoices: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; userId: string },
        Array<any>
      >;
      listOrgInvoices: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          limit?: number;
          organizationId: string;
          status?: string;
        },
        any
      >;
      listPayments: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        Array<any>
      >;
      listTenantInvoices: FunctionReference<
        "query",
        "internal",
        { limit?: number; status?: string; tenantId: string },
        any
      >;
      listUserInvoices: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit?: number; status?: string; userId: string },
        any
      >;
      pendingCount: FunctionReference<
        "query",
        "internal",
        { limit?: number; userId: string },
        { count: number }
      >;
    };
  };
  integrations: {
    mutations: {
      completeSyncLog: FunctionReference<
        "mutation",
        "internal",
        {
          error?: string;
          id: string;
          metadata?: any;
          recordsFailed?: number;
          recordsProcessed?: number;
          status: string;
        },
        { success: boolean }
      >;
      configure: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          config: any;
          environment?: string;
          integrationType: string;
          metadata?: any;
          name: string;
          secretKey?: string;
          tenantId: string;
          webhookSecret?: string;
        },
        { id: string }
      >;
      deleteWebhook: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      disableIntegration: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      enableIntegration: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      registerWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          callbackUrl: string;
          events: Array<string>;
          integrationId: string;
          metadata?: any;
          secret?: string;
          tenantId: string;
        },
        { id: string }
      >;
      removeIntegration: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      startSync: FunctionReference<
        "mutation",
        "internal",
        { integrationId: string; syncType: string; tenantId: string },
        { id: string }
      >;
      testConnection: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { status: string; success: boolean }
      >;
      updateConfig: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          config?: any;
          environment?: string;
          id: string;
          metadata?: any;
          name?: string;
          secretKey?: string;
          webhookSecret?: string;
        },
        { success: boolean }
      >;
      updateWebhook: FunctionReference<
        "mutation",
        "internal",
        {
          callbackUrl?: string;
          events?: Array<string>;
          id: string;
          isActive?: boolean;
          metadata?: any;
          secret?: string;
        },
        { success: boolean }
      >;
    };
    queries: {
      getById: FunctionReference<"query", "internal", { id: string }, any>;
      getConfig: FunctionReference<
        "query",
        "internal",
        { integrationType: string; tenantId: string },
        any
      >;
      getConfigInternal: FunctionReference<
        "query",
        "internal",
        { integrationType: string; tenantId: string },
        any
      >;
      getSyncLog: FunctionReference<"query", "internal", { id: string }, any>;
      listConfigs: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
      listSyncLogs: FunctionReference<
        "query",
        "internal",
        { integrationId?: string; limit?: number; tenantId: string },
        Array<any>
      >;
      listWebhooks: FunctionReference<
        "query",
        "internal",
        { integrationId?: string; limit?: number; tenantId: string },
        Array<any>
      >;
    };
  };
  guides: {
    import: {
      importArticle: FunctionReference<
        "mutation",
        "internal",
        {
          content?: string;
          guideId: string;
          isPublished: boolean;
          order: number;
          sectionId: string;
          slug: string;
          tenantId: string;
          title: string;
          videoUrl?: string;
        },
        { id: string }
      >;
      importGuide: FunctionReference<
        "mutation",
        "internal",
        {
          authorId?: string;
          category?: string;
          description: string;
          isPublished: boolean;
          slug: string;
          tenantId: string;
          title: string;
        },
        { id: string }
      >;
      importSection: FunctionReference<
        "mutation",
        "internal",
        {
          description?: string;
          guideId: string;
          isPublished: boolean;
          order: number;
          tenantId: string;
          title: string;
        },
        { id: string }
      >;
    };
    mutations: {
      markArticleRead: FunctionReference<
        "mutation",
        "internal",
        {
          articleId: string;
          guideId: string;
          tenantId: string;
          userId: string;
        },
        any
      >;
    };
    queries: {
      getArticle: FunctionReference<
        "query",
        "internal",
        { articleSlug: string; guideSlug: string; tenantId: string },
        any
      >;
      getGuide: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any
      >;
      getUserProgress: FunctionReference<
        "query",
        "internal",
        { guideId: string; userId: string },
        null | {
          _id: string;
          completedArticles: Array<string>;
          lastAccessedAt: number;
          status: string;
        }
      >;
      listGuides: FunctionReference<
        "query",
        "internal",
        { category?: string; isPublished?: boolean; tenantId: string },
        Array<any>
      >;
    };
  };
  support: {
    import: {
      importTicket: FunctionReference<
        "mutation",
        "internal",
        {
          assigneeUserId?: string;
          attachmentUrls?: Array<string>;
          category: string;
          closedAt?: number;
          description: string;
          firstResponseAt?: number;
          messageCount?: number;
          priority: string;
          reporterUserId: string;
          resolvedAt?: number;
          slaDeadline?: number;
          status: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      importTicketMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          tenantId: string;
          ticketId: string;
          type: string;
        },
        { id: string }
      >;
    };
    mutations: {
      addMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          tenantId: string;
          ticketId: string;
          type: string;
        },
        { id: string }
      >;
      assignTicket: FunctionReference<
        "mutation",
        "internal",
        { assigneeUserId: string; id: string },
        { success: boolean }
      >;
      changeStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; status: string },
        { success: boolean }
      >;
      createTicket: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          category: string;
          description: string;
          priority: string;
          reporterUserId: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      escalateTicket: FunctionReference<
        "mutation",
        "internal",
        { id: string; newAssigneeUserId?: string; newPriority?: string },
        { success: boolean }
      >;
      updateTicket: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          description?: string;
          id: string;
          priority?: string;
          subject?: string;
          tags?: Array<string>;
        },
        { success: boolean }
      >;
    };
    queries: {
      getTicket: FunctionReference<"query", "internal", { id: string }, any>;
      getTicketCounts: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any
      >;
      listTicketMessages: FunctionReference<
        "query",
        "internal",
        { limit?: number; ticketId: string },
        Array<any>
      >;
      listTickets: FunctionReference<
        "query",
        "internal",
        {
          assigneeUserId?: string;
          category?: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
    };
  };
  subscriptions: {
    functions: {
      countBenefitUsage: FunctionReference<
        "query",
        "internal",
        { benefitId: string; membershipId: string },
        number
      >;
      createBenefitUsage: FunctionReference<
        "mutation",
        "internal",
        {
          benefitId: string;
          benefitType: string;
          description?: string;
          discountAmount?: number;
          membershipId: string;
          metadata?: any;
          orderId?: string;
          performanceId?: string;
          tenantId: string;
          usedAt: number;
        },
        { id: string }
      >;
      createCreatorAccount: FunctionReference<
        "mutation",
        "internal",
        {
          status?: string;
          stripeAccountId: string;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
      createMembership: FunctionReference<
        "mutation",
        "internal",
        {
          autoRenew?: boolean;
          creatorId?: string;
          endDate: number;
          enrollmentChannel?: string;
          lastPaymentDate?: number;
          memberNumber?: string;
          metadata?: any;
          nextBillingDate?: number;
          originalStartDate?: number;
          presaleAccessGranted?: boolean;
          startDate: number;
          status?: string;
          stripeCustomerId?: string;
          stripeSubscriptionId?: string;
          tenantId: string;
          tierId: string;
          trialEndDate?: number;
          trialStartDate?: number;
          userId: string;
        },
        { id: string }
      >;
      createTier: FunctionReference<
        "mutation",
        "internal",
        {
          benefits: Array<{
            config: any;
            id: string;
            label: string;
            type: string;
          }>;
          billingInterval: string;
          color?: string;
          currency: string;
          description?: string;
          earlyAccessDays?: number;
          iconStorageId?: string;
          isActive?: boolean;
          isPublic?: boolean;
          isWaitlistEnabled?: boolean;
          maxMembers?: number;
          metadata?: any;
          name: string;
          price: number;
          pricingGroupId?: string;
          shortDescription?: string;
          slug: string;
          sortOrder?: number;
          stripePriceId?: string;
          stripeProductId?: string;
          tenantId: string;
          trialDays?: number;
        },
        { id: string }
      >;
      getCreatorAccount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getCreatorAccountByStripeId: FunctionReference<
        "query",
        "internal",
        { stripeAccountId: string },
        any
      >;
      getMembership: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getMembershipByStripeSubscription: FunctionReference<
        "query",
        "internal",
        { stripeSubscriptionId: string },
        any
      >;
      getMembershipByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any
      >;
      getMembershipByUserAndCreator: FunctionReference<
        "query",
        "internal",
        { creatorId: string; userId: string },
        any
      >;
      getMembershipStats: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any
      >;
      getTier: FunctionReference<"query", "internal", { id: string }, any>;
      getTierBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any
      >;
      getTrialStatus: FunctionReference<
        "query",
        "internal",
        { creatorId: string; userId: string },
        any
      >;
      getUserCreatorSubscription: FunctionReference<
        "query",
        "internal",
        { creatorId: string; userId: string },
        any
      >;
      listBenefitUsage: FunctionReference<
        "query",
        "internal",
        { benefitType?: string; membershipId: string },
        Array<any>
      >;
      listCreatorSubscribers: FunctionReference<
        "query",
        "internal",
        { creatorId: string; status?: string },
        Array<any>
      >;
      listDueForRenewal: FunctionReference<
        "query",
        "internal",
        { beforeDate: number },
        Array<any>
      >;
      listExpiringTrials: FunctionReference<
        "query",
        "internal",
        { beforeDate: number },
        Array<any>
      >;
      listMemberships: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          limit?: number;
          status?: string;
          tenantId: string;
          tierId?: string;
          userId?: string;
        },
        any
      >;
      listMembershipsByCreatorIds: FunctionReference<
        "query",
        "internal",
        { creatorIds: Array<string>; userId: string },
        Array<any>
      >;
      listTiers: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; publicOnly?: boolean; tenantId: string },
        Array<any>
      >;
      updateCreatorAccount: FunctionReference<
        "mutation",
        "internal",
        {
          chargesEnabled?: boolean;
          detailsSubmitted?: boolean;
          id: string;
          metadata?: any;
          payoutsEnabled?: boolean;
          status?: string;
        },
        { success: boolean }
      >;
      updateMembership: FunctionReference<
        "mutation",
        "internal",
        {
          autoRenew?: boolean;
          benefitsUsedThisPeriod?: any;
          convertedFromTrial?: boolean;
          endDate?: number;
          failedPaymentCount?: number;
          id: string;
          lastPaymentDate?: number;
          lastPaymentId?: string;
          memberNumber?: string;
          metadata?: any;
          nextBillingDate?: number;
          presaleAccessGranted?: boolean;
          previousTierId?: string;
          tierId?: string;
        },
        { success: boolean }
      >;
      updateMembershipStatus: FunctionReference<
        "mutation",
        "internal",
        {
          cancelEffectiveDate?: number;
          cancelReason?: string;
          cancelledAt?: number;
          cancelledBy?: string;
          id: string;
          status: string;
        },
        { success: boolean }
      >;
      updateTier: FunctionReference<
        "mutation",
        "internal",
        {
          benefits?: Array<{
            config: any;
            id: string;
            label: string;
            type: string;
          }>;
          billingInterval?: string;
          color?: string;
          currency?: string;
          description?: string;
          earlyAccessDays?: number;
          iconStorageId?: string;
          id: string;
          isActive?: boolean;
          isPublic?: boolean;
          isWaitlistEnabled?: boolean;
          maxMembers?: number;
          metadata?: any;
          name?: string;
          price?: number;
          pricingGroupId?: string;
          shortDescription?: string;
          slug?: string;
          sortOrder?: number;
          stripePriceId?: string;
          stripeProductId?: string;
          trialDays?: number;
        },
        { success: boolean }
      >;
      updateTierMemberCount: FunctionReference<
        "mutation",
        "internal",
        { delta: number; id: string },
        { success: boolean }
      >;
    };
  };
  externalReviews: {
    functions: {
      batchImport: FunctionReference<
        "mutation",
        "internal",
        {
          reviews: Array<{
            authorName: string;
            authorUrl?: string;
            externalCreatedAt: number;
            externalId: string;
            externalUrl?: string;
            metadata?: any;
            platform: string;
            rating: number;
            resourceId: string;
            text?: string;
            title?: string;
          }>;
          tenantId: string;
        },
        { imported: number; updated: number }
      >;
      batchStats: FunctionReference<
        "query",
        "internal",
        { resourceIds: Array<string> },
        any
      >;
      getConfig: FunctionReference<
        "query",
        "internal",
        { platform: string; tenantId: string },
        any
      >;
      getConfigRaw: FunctionReference<
        "query",
        "internal",
        { platform: string; tenantId: string },
        any
      >;
      importReview: FunctionReference<
        "mutation",
        "internal",
        {
          authorName: string;
          authorUrl?: string;
          externalCreatedAt: number;
          externalId: string;
          externalUrl?: string;
          metadata?: any;
          platform: string;
          rating: number;
          resourceId: string;
          tenantId: string;
          text?: string;
          title?: string;
        },
        { id: string; isNew: boolean }
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          platform?: string;
          resourceId?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listEnabledConfigs: FunctionReference<
        "query",
        "internal",
        {},
        Array<any>
      >;
      listForResource: FunctionReference<
        "query",
        "internal",
        { platform?: string; resourceId: string },
        Array<any>
      >;
      stats: FunctionReference<
        "query",
        "internal",
        { resourceId: string },
        any
      >;
      suppress: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      unsuppress: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      updateSyncStatus: FunctionReference<
        "mutation",
        "internal",
        { error?: string; platform: string; status: string; tenantId: string },
        { success: boolean }
      >;
      upsertConfig: FunctionReference<
        "mutation",
        "internal",
        {
          apiKey?: string;
          displayOnListing: boolean;
          isEnabled: boolean;
          locationId?: string;
          placeId?: string;
          platform: string;
          tenantId: string;
        },
        { id: string }
      >;
    };
  };
  classification: {
    mutations: {
      createAttributeDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          categoryId: string;
          isRequired?: boolean;
          key: string;
          metadata?: any;
          name: string;
          options?: Array<string>;
          sortOrder?: number;
          tenantId: string;
          type: string;
        },
        { id: string }
      >;
      createCategory: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          description?: string;
          icon?: string;
          isActive?: boolean;
          metadata?: any;
          name: string;
          parentId?: string;
          slug: string;
          sortOrder?: number;
          tenantId: string;
        },
        { id: string }
      >;
      createTag: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          isActive?: boolean;
          metadata?: any;
          name: string;
          slug: string;
          tenantId: string;
        },
        { id: string }
      >;
      deleteAttributeDefinition: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      deleteCategory: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      deleteTag: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      reorderCategories: FunctionReference<
        "mutation",
        "internal",
        { ids: Array<string> },
        { success: boolean }
      >;
      updateAttributeDefinition: FunctionReference<
        "mutation",
        "internal",
        {
          id: string;
          isRequired?: boolean;
          key?: string;
          metadata?: any;
          name?: string;
          options?: Array<string>;
          sortOrder?: number;
          type?: string;
        },
        { success: boolean }
      >;
      updateCategory: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          description?: string;
          icon?: string;
          id: string;
          isActive?: boolean;
          metadata?: any;
          name?: string;
          slug?: string;
          sortOrder?: number;
        },
        { success: boolean }
      >;
      updateTag: FunctionReference<
        "mutation",
        "internal",
        {
          color?: string;
          id: string;
          isActive?: boolean;
          metadata?: any;
          name?: string;
          slug?: string;
        },
        { success: boolean }
      >;
    };
    queries: {
      getAttributeDefinition: FunctionReference<
        "query",
        "internal",
        { key: string; tenantId: string },
        any
      >;
      getCategory: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any
      >;
      getCategoryById: FunctionReference<
        "query",
        "internal",
        { id: string },
        any
      >;
      getCategoryTree: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any
      >;
      getTag: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any
      >;
      listAttributeDefinitions: FunctionReference<
        "query",
        "internal",
        { categoryId?: string; tenantId: string },
        Array<any>
      >;
      listCategories: FunctionReference<
        "query",
        "internal",
        { parentId?: string; tenantId: string },
        Array<any>
      >;
      listTags: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        Array<any>
      >;
    };
  };
  picks: {
    functions: {
      addPickCollaborator: FunctionReference<
        "mutation",
        "internal",
        {
          creatorId: string;
          pickId: string;
          role: string;
          splitPercent: number;
          tenantId: string;
        },
        { id: string }
      >;
      bankrollInsights: FunctionReference<
        "query",
        "internal",
        { bankroll: number; tenantId: string; userId: string },
        {
          kellySuggestions: Array<{
            avgOdds: number;
            confidence: string;
            historicalWinRate: number;
            kellyFraction: number;
            suggestedDollarAmount: number;
            suggestedUnits: number;
          }>;
          projection: {
            breakEvenPicks?: number;
            next100PicksExpected: number;
            next50PicksExpected: number;
          };
          riskMetrics: {
            currentDrawdown: number;
            maxDrawdown: number;
            maxDrawdownPercent: number;
            sharpeRatio: number;
            variance: number;
          };
          sampleSize: number;
        }
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          analysis?: string;
          confidence: string;
          creatorId: string;
          event: string;
          eventDate?: number;
          league?: string;
          metadata?: any;
          oddsAmerican: string;
          oddsDecimal: number;
          pickType: string;
          selection: string;
          sport: string;
          status?: string;
          tenantId: string;
          units: number;
        },
        { id: string }
      >;
      creatorStats: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        {
          losses: number;
          netUnits: number;
          pending: number;
          pushes: number;
          roi: number;
          totalPicks: number;
          voids: number;
          winRate: number;
          wins: number;
        }
      >;
      creatorStatsBySport: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<{
          avgOdds: number;
          losses: number;
          netUnits: number;
          pushes: number;
          roi: number;
          sport: string;
          totalPicks: number;
          winRate: number;
          wins: number;
        }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { id: string; tenantId?: string },
        any
      >;
      grade: FunctionReference<
        "mutation",
        "internal",
        {
          gradedBy: string;
          id: string;
          result: "won" | "lost" | "push" | "void";
          tenantId?: string;
        },
        { success: boolean }
      >;
      isTailed: FunctionReference<
        "query",
        "internal",
        { pickId: string; userId: string },
        boolean
      >;
      leaderboard: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          sortBy?: "roi" | "winRate" | "streak" | "totalPicks";
          sport?: string;
          tenantId: string;
          timeframe?: "30d" | "90d" | "all";
        },
        Array<{
          avgOdds: number;
          creatorId: string;
          currentStreak: number;
          losses: number;
          netUnits: number;
          pushes: number;
          roi: number;
          streakType: "W" | "L" | "none";
          totalPicks: number;
          winRate: number;
          wins: number;
        }>
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          limit?: number;
          result?: string;
          sport?: string;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listPickCollaborators: FunctionReference<
        "query",
        "internal",
        { pickId: string },
        Array<any>
      >;
      listPicksByCollaborator: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<any>
      >;
      listPublishedFeed: FunctionReference<
        "query",
        "internal",
        {
          creatorIds?: Array<string>;
          cursor?: number;
          limit?: number;
          result?: string;
          sport?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listTailed: FunctionReference<
        "query",
        "internal",
        {
          creatorId?: string;
          result?: string;
          sport?: string;
          tenantId: string;
          userId: string;
        },
        Array<any>
      >;
      performancePredictions: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        {
          bestEdges: Array<{
            league?: string;
            pickType: string;
            picks: number;
            roi: number;
            sport: string;
            winRate: number;
          }>;
          confidenceCalibration: Array<{
            avgOdds: number;
            confidence: string;
            picks: number;
            roi: number;
            winRate: number;
          }>;
          currentStreak: { length: number; type: "win" | "loss" | "none" };
          longestLossStreak: number;
          longestWinStreak: number;
          overallWinRate: number;
          pickTypeBreakdown: Array<{
            pickType: string;
            picks: number;
            roi: number;
            winRate: number;
          }>;
          recentWinRate: number;
          sampleSize: number;
          trend: "improving" | "declining" | "stable";
        }
      >;
      personalStats: FunctionReference<
        "query",
        "internal",
        { startingBankroll?: number; tenantId: string; userId: string },
        {
          currentBankroll?: number;
          losses: number;
          netUnits: number;
          pending: number;
          pushes: number;
          roi: number;
          sportBreakdown: Array<{
            losses: number;
            netUnits: number;
            picks: number;
            sport: string;
            winRate: number;
            wins: number;
          }>;
          totalTailed: number;
          totalWagered: number;
          voids: number;
          winRate: number;
          wins: number;
        }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      removePickCollaborator: FunctionReference<
        "mutation",
        "internal",
        { creatorId: string; pickId: string },
        { success: boolean }
      >;
      setPickCollaborators: FunctionReference<
        "mutation",
        "internal",
        {
          collaborators: Array<{
            creatorId: string;
            role: string;
            splitPercent: number;
          }>;
          pickId: string;
          tenantId: string;
        },
        { success: boolean }
      >;
      sportDashboard: FunctionReference<
        "query",
        "internal",
        {
          sport: string;
          tenantId: string;
          timeframe?: "7d" | "30d" | "90d" | "all";
        },
        {
          avgOdds: number;
          gradedPicks: number;
          losses: number;
          netUnits: number;
          pendingPicks: number;
          pickTypeBreakdown: Array<{
            count: number;
            losses: number;
            netUnits: number;
            pickType: string;
            winRate: number;
            wins: number;
          }>;
          pushes: number;
          recentResults: Array<{ count: number; result: string }>;
          roi: number;
          sport: string;
          topCreators: Array<{
            creatorId: string;
            losses: number;
            netUnits: number;
            roi: number;
            winRate: number;
            wins: number;
          }>;
          totalCreators: number;
          totalPicks: number;
          winRate: number;
          wins: number;
        }
      >;
      sportOverview: FunctionReference<
        "query",
        "internal",
        { tenantId: string; timeframe?: "7d" | "30d" | "90d" | "all" },
        Array<{
          gradedPicks: number;
          losses: number;
          netUnits: number;
          roi: number;
          sport: string;
          totalCreators: number;
          totalPicks: number;
          winRate: number;
          wins: number;
        }>
      >;
      tailPick: FunctionReference<
        "mutation",
        "internal",
        {
          pickId: string;
          startingBankroll?: number;
          tenantId: string;
          userId: string;
        },
        { id: string }
      >;
      untailPick: FunctionReference<
        "mutation",
        "internal",
        { pickId: string; userId: string },
        { success: boolean }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          analysis?: string;
          confidence?: string;
          event?: string;
          eventDate?: number;
          id: string;
          league?: string;
          metadata?: any;
          oddsAmerican?: string;
          oddsDecimal?: number;
          pickType?: string;
          selection?: string;
          sport?: string;
          status?: string;
          units?: number;
        },
        { success: boolean }
      >;
      validatePickSplits: FunctionReference<
        "query",
        "internal",
        { pickId: string },
        { collaboratorCount: number; totalPercent: number; valid: boolean }
      >;
    };
  };
  broadcasts: {
    functions: {
      get: FunctionReference<"query", "internal", { id: string }, any>;
      listByCreator: FunctionReference<
        "query",
        "internal",
        {
          creatorId: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listForSubscriber: FunctionReference<
        "query",
        "internal",
        {
          limit?: number;
          tenantId: string;
          unreadOnly?: boolean;
          userId: string;
        },
        Array<any>
      >;
      markAsRead: FunctionReference<
        "mutation",
        "internal",
        { broadcastId: string; userId: string },
        { success: boolean }
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      send: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          creatorId: string;
          messageType: string;
          metadata?: any;
          pickId?: string;
          recipientIds: Array<string>;
          tenantId: string;
          title: string;
        },
        { id: string; recipientCount: number }
      >;
      unreadCount: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        { count: number }
      >;
    };
  };
  disputes: {
    import: {
      importDispute: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          closedAt?: number;
          description: string;
          escalatedAt?: number;
          evidenceUrls?: Array<string>;
          filedByUserId: string;
          mediatorUserId?: string;
          messageCount?: number;
          priority: string;
          relatedMembershipId?: string;
          relatedPickId?: string;
          resolution?: string;
          resolutionNote?: string;
          resolvedAt?: number;
          respondentUserId: string;
          status: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      importDisputeMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          disputeId: string;
          tenantId: string;
          type: string;
        },
        { id: string }
      >;
    };
    mutations: {
      addMessage: FunctionReference<
        "mutation",
        "internal",
        {
          attachmentUrls?: Array<string>;
          authorUserId: string;
          body: string;
          disputeId: string;
          tenantId: string;
          type: string;
        },
        { id: string }
      >;
      assignMediator: FunctionReference<
        "mutation",
        "internal",
        { id: string; mediatorUserId: string },
        { success: boolean }
      >;
      changeStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; status: string },
        { success: boolean }
      >;
      createDispute: FunctionReference<
        "mutation",
        "internal",
        {
          category: string;
          description: string;
          evidenceUrls?: Array<string>;
          filedByUserId: string;
          priority: string;
          relatedMembershipId?: string;
          relatedPickId?: string;
          respondentUserId: string;
          subject: string;
          tags?: Array<string>;
          tenantId: string;
        },
        { id: string }
      >;
      escalateDispute: FunctionReference<
        "mutation",
        "internal",
        { id: string; newMediatorUserId?: string; newPriority?: string },
        { success: boolean }
      >;
      resolveDispute: FunctionReference<
        "mutation",
        "internal",
        { id: string; resolution: string; resolutionNote?: string },
        { success: boolean }
      >;
      updateDispute: FunctionReference<
        "mutation",
        "internal",
        {
          category?: string;
          description?: string;
          id: string;
          priority?: string;
          subject?: string;
          tags?: Array<string>;
        },
        { success: boolean }
      >;
    };
    queries: {
      getDispute: FunctionReference<"query", "internal", { id: string }, any>;
      getDisputeCounts: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any
      >;
      listDisputeMessages: FunctionReference<
        "query",
        "internal",
        { disputeId: string; limit?: number },
        Array<any>
      >;
      listDisputes: FunctionReference<
        "query",
        "internal",
        {
          category?: string;
          filedByUserId?: string;
          limit?: number;
          mediatorUserId?: string;
          respondentUserId?: string;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
    };
  };
  discord: {
    functions: {
      createSyncLogEntry: FunctionReference<
        "mutation",
        "internal",
        {
          action: "assign" | "remove";
          discordRoleId: string;
          discordUserId: string;
          guildId: string;
          membershipId?: string;
          tenantId: string;
          tierId?: string;
          trigger: string;
          userId: string;
        },
        { id: string }
      >;
      disconnectUser: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string; userId: string },
        { success: boolean }
      >;
      getConnection: FunctionReference<
        "query",
        "internal",
        { tenantId: string; userId: string },
        any
      >;
      getConnectionByDiscordId: FunctionReference<
        "query",
        "internal",
        { discordUserId: string },
        any
      >;
      getRoleMappingByTier: FunctionReference<
        "query",
        "internal",
        { tenantId: string; tierId: string },
        any
      >;
      getServerConfig: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        any
      >;
      listConnections: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
      listPendingSyncs: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<any>
      >;
      listRoleMappings: FunctionReference<
        "query",
        "internal",
        { creatorId: string; tenantId: string },
        Array<any>
      >;
      listSyncLog: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string; userId: string },
        Array<any>
      >;
      removeRoleMapping: FunctionReference<
        "mutation",
        "internal",
        { tenantId: string; tierId: string },
        { success: boolean }
      >;
      toggleServerConfig: FunctionReference<
        "mutation",
        "internal",
        { creatorId: string; isEnabled: boolean; tenantId: string },
        { success: boolean }
      >;
      updateSyncLogStatus: FunctionReference<
        "mutation",
        "internal",
        { error?: string; id: string; status: "success" | "failed" },
        { success: boolean }
      >;
      upsertConnection: FunctionReference<
        "mutation",
        "internal",
        {
          accessToken: string;
          discordUserId: string;
          discordUsername: string;
          refreshToken: string;
          scopes: Array<string>;
          tenantId: string;
          tokenExpiresAt: number;
          userId: string;
        },
        { id: string }
      >;
      upsertRoleMapping: FunctionReference<
        "mutation",
        "internal",
        {
          creatorId: string;
          discordRoleId: string;
          discordRoleName?: string;
          tenantId: string;
          tierId: string;
        },
        { id: string }
      >;
      upsertServerConfig: FunctionReference<
        "mutation",
        "internal",
        {
          botToken: string;
          clientId: string;
          clientSecret: string;
          creatorId: string;
          guildId: string;
          guildName?: string;
          isEnabled?: boolean;
          tenantId: string;
        },
        { id: string }
      >;
    };
  };
  emailCampaigns: {
    functions: {
      addRecipients: FunctionReference<
        "mutation",
        "internal",
        {
          campaignId: string;
          recipients: Array<{ email: string; userId: string }>;
          tenantId: string;
        },
        { added: number }
      >;
      cancel: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      create: FunctionReference<
        "mutation",
        "internal",
        {
          body: string;
          campaignType: string;
          creatorId: string;
          metadata?: any;
          name: string;
          preheader?: string;
          segment: {
            activeSinceDays?: number;
            inactiveSinceDays?: number;
            tags?: Array<string>;
            tierId?: string;
            type: string;
          };
          subject: string;
          templateCategory?: string;
          tenantId: string;
        },
        { id: string }
      >;
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getAnalytics: FunctionReference<
        "query",
        "internal",
        { campaignId: string },
        any
      >;
      isUnsubscribed: FunctionReference<
        "query",
        "internal",
        { email: string; tenantId: string },
        boolean
      >;
      list: FunctionReference<
        "query",
        "internal",
        {
          campaignType?: string;
          limit?: number;
          status?: string;
          tenantId: string;
        },
        Array<any>
      >;
      listRecipients: FunctionReference<
        "query",
        "internal",
        { campaignId: string; limit?: number; status?: string },
        Array<any>
      >;
      listScheduledReady: FunctionReference<
        "query",
        "internal",
        { now: number },
        Array<any>
      >;
      markSending: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      markSent: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      resubscribe: FunctionReference<
        "mutation",
        "internal",
        { email: string; tenantId: string },
        { success: boolean }
      >;
      schedule: FunctionReference<
        "mutation",
        "internal",
        { id: string; scheduledAt: number },
        { success: boolean }
      >;
      unsubscribe: FunctionReference<
        "mutation",
        "internal",
        { email: string; reason?: string; tenantId: string; userId: string },
        { success: boolean }
      >;
      update: FunctionReference<
        "mutation",
        "internal",
        {
          body?: string;
          campaignType?: string;
          id: string;
          metadata?: any;
          name?: string;
          preheader?: string;
          segment?: {
            activeSinceDays?: number;
            inactiveSinceDays?: number;
            tags?: Array<string>;
            tierId?: string;
            type: string;
          };
          subject?: string;
        },
        { success: boolean }
      >;
      updateRecipientStatus: FunctionReference<
        "mutation",
        "internal",
        {
          bounceReason?: string;
          id: string;
          resendId?: string;
          status: string;
        },
        { success: boolean }
      >;
    };
  };
  creatorApplications: {
    functions: {
      countsByStatus: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        {
          approved: number;
          draft: number;
          in_review: number;
          needs_more_info: number;
          rejected: number;
          submitted: number;
          total: number;
        }
      >;
      deleteDraft: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      get: FunctionReference<"query", "internal", { id: string }, any>;
      getForApplicant: FunctionReference<
        "query",
        "internal",
        { applicantUserId: string; tenantId: string },
        any
      >;
      list: FunctionReference<
        "query",
        "internal",
        { limit?: number; tenantId: string },
        Array<any>
      >;
      listByStatus: FunctionReference<
        "query",
        "internal",
        { limit?: number; status: string; tenantId: string },
        Array<any>
      >;
      submit: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean }
      >;
      updateStatus: FunctionReference<
        "mutation",
        "internal",
        { id: string; reviewNote?: string; reviewedBy: string; status: string },
        { previousStatus: string; success: boolean }
      >;
      upsertDraft: FunctionReference<
        "mutation",
        "internal",
        {
          ageConfirmed: boolean;
          applicantUserId: string;
          avatarStorageId?: string;
          bio: string;
          country: string;
          dateOfBirth?: string;
          displayName: string;
          externalLinks: Array<{ label: string; url: string }>;
          fullName: string;
          handle: string;
          idDocumentStorageId?: string;
          nicheTags: Array<string>;
          primarySports: Array<string>;
          rulesAccepted: boolean;
          sampleNotes?: string;
          tenantId: string;
        },
        { id: string }
      >;
    };
  };
};
