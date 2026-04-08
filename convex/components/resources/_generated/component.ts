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
    mutations: {
      adminPatch: FunctionReference<
        "mutation",
        "internal",
        { id: string; patch: any },
        { success: boolean },
        Name
      >;
      archive: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      cloneResource: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { id: string; slug: string },
        Name
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
        { id: string },
        Name
      >;
      hardDelete: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
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
        { id: string },
        Name
      >;
      publish: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      reassignTenant: FunctionReference<
        "mutation",
        "internal",
        { id: string; organizationId?: string; tenantId: string },
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
      restore: FunctionReference<
        "mutation",
        "internal",
        { id: string },
        { success: boolean },
        Name
      >;
      unpublish: FunctionReference<
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
        { success: boolean },
        Name
      >;
    };
    queries: {
      get: FunctionReference<"query", "internal", { id: string }, any, Name>;
      getBySlug: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId: string },
        any,
        Name
      >;
      getBySlugPublic: FunctionReference<
        "query",
        "internal",
        { slug: string; tenantId?: string },
        any,
        Name
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
        Array<any>,
        Name
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
        Array<any>,
        Name
      >;
      listByVenueSlug: FunctionReference<
        "query",
        "internal",
        { tenantId: string; venueSlug: string },
        Array<any>,
        Name
      >;
      listPlatform: FunctionReference<
        "query",
        "internal",
        { categoryKey?: string; limit?: number; status?: string },
        Array<any>,
        Name
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
        Array<any>,
        Name
      >;
      scanAll: FunctionReference<
        "query",
        "internal",
        { limit?: number },
        Array<any>,
        Name
      >;
    };
  };
