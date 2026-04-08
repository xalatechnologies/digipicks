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
      createMembership: FunctionReference<
        "mutation",
        "internal",
        {
          autoRenew?: boolean;
          endDate: number;
          enrollmentChannel?: string;
          memberNumber?: string;
          metadata?: any;
          nextBillingDate?: number;
          originalStartDate?: number;
          presaleAccessGranted?: boolean;
          startDate: number;
          status?: string;
          tenantId: string;
          tierId: string;
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
          tenantId: string;
          trialDays?: number;
        },
        { id: string },
        Name
      >;
      getMembership: FunctionReference<
        "query",
        "internal",
        { id: string },
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
      listBenefitUsage: FunctionReference<
        "query",
        "internal",
        { benefitType?: string; membershipId: string },
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
      listMemberships: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          limit?: number;
          status?: string;
          tenantId: string;
          tierId?: string;
        },
        any,
        Name
      >;
      listTiers: FunctionReference<
        "query",
        "internal",
        { activeOnly?: boolean; publicOnly?: boolean; tenantId: string },
        Array<any>,
        Name
      >;
      updateMembership: FunctionReference<
        "mutation",
        "internal",
        {
          autoRenew?: boolean;
          benefitsUsedThisPeriod?: any;
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
