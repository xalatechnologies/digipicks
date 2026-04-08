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
        any,
        Name
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
        any,
        Name
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
        { id: string; success: boolean },
        Name
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
        { id: string },
        Name
      >;
      deleteDiscountCode: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      getDiscountCode: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      listDiscountCodes: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; tenantId: string },
        Array<any>,
        Name
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
        { success: boolean },
        Name
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
        any,
        Name
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
        { id: string },
        Name
      >;
      deleteHoliday: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      getHoliday: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      listHolidays: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; tenantId: string },
        Array<any>,
        Name
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
        { success: boolean },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
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
        { id: string },
        Name
      >;
      deletePackage: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      remove: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeAdditionalService: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeGroup: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeOrgPricingGroup: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeTicketTemplate: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      removeUserPricingGroup: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
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
        { success: boolean },
        Name
      >;
    };
    queries: {
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      getAdditionalService: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getAdditionalServicesByIds: FunctionReference<
        "query",
        "internal",
        { ids: Array<string> },
        Array<any>,
        Name
      >;
      getGroup: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getOrgPricingGroup: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getPackage: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getResourcePriceGroups: FunctionReference<
        "query",
        "internal",
        { bookingMode?: string; resourceId: string; tenantId: string },
        Array<any>,
        Name
      >;
      getResourcePricingConfig: FunctionReference<
        "query",
        "internal",
        { bookingMode?: string; resourceId: string },
        any,
        Name
      >;
      getTicketTemplate: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      getUserPricingGroup: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
      >;
      listAdditionalServices: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; resourceId: string },
        Array<any>,
        Name
      >;
      listAdditionalServicesByTenant: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listByTenant: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>,
        Name
      >;
      listForResource: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; resourceId: string },
        Array<any>,
        Name
      >;
      listGroups: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>,
        Name
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
        Array<any>,
        Name
      >;
      listPackages: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; isPublic?: boolean; tenantId: string },
        Array<any>,
        Name
      >;
      listTicketTemplates: FunctionReference<
        "query",
        "internal",
        { isActive?: boolean; limit?: number; tenantId: string },
        Array<any>,
        Name
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
        Array<any>,
        Name
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
        { id: string },
        Name
      >;
      deleteWeekdayPricing: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
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
        Array<any>,
        Name
      >;
      getWeekdayPricingRule: FunctionReference<
        "query",
        "internal",
        { id: string },
        any,
        Name
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
        Array<any>,
        Name
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
        { success: boolean },
        Name
      >;
    };
  };
