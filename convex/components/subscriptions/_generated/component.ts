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
      countBenefitUsage: FunctionReference<
        "query",
        "internal",
        { benefitId: string; membershipId: string },
        number,
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
      >;
      getCreatorAccount: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      getCreatorAccountByStripeId: FunctionReference<
        "query",
        "internal",
        { stripeAccountId: string },
        any,
        Name
      >;
      getMembership: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getMembershipByStripeSubscription: FunctionReference<
        "query",
        "internal",
        { stripeSubscriptionId: string },
        any,
        Name
      >;
      getMembershipByUser: FunctionReference<
        "query",
        "internal",
        { userId: string },
        any,
        Name
      >;
      getMembershipByUserAndCreator: FunctionReference<
        "query",
        "internal",
        { creatorId: string; userId: string },
        any,
        Name
      >;
      getMembershipStats: FunctionReference<
        "query",
        "internal",
        { tenantId: string },
        any,
        Name
      >;
      getTier: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getTierBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any,
        Name
      >;
      getTrialStatus: FunctionReference<
        "query",
        "internal",
        { creatorId: string; userId: string },
        any,
        Name
      >;
      getUserCreatorSubscription: FunctionReference<
        "query",
        "internal",
        { creatorId: string; userId: string },
        any,
        Name
      >;
      listBenefitUsage: FunctionReference<
        "query",
        "internal",
        { benefitType?: string; membershipId: string },
        Array<any>,
        Name
      >;
      listCreatorSubscribers: FunctionReference<
        "query",
        "internal",
        { creatorId: string; status?: string },
        Array<any>,
        Name
      >;
      listDueForRenewal: FunctionReference<
        "query",
        "internal",
        { beforeDate: number },
        Array<any>,
        Name
      >;
      listExpiringTrials: FunctionReference<
        "query",
        "internal",
        { beforeDate: number },
        Array<any>,
        Name
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
        any,
        Name
      >;
      listMembershipsByCreatorIds: FunctionReference<
        "query",
        "internal",
        { creatorIds: Array<string>; userId: string },
        Array<any>,
        Name
      >;
      listTiers: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; publicOnly?: boolean; tenantId: string },
        Array<any>,
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
      >;
      updateTierMemberCount: FunctionReference<
        "mutation",
        "internal",
        { delta: number; id: string },
        { success: boolean },
        Name
      >;
    };
  };
