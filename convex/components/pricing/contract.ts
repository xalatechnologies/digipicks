/**
 * Pricing Component Contract
 */

import { v } from "convex/values";
import { defineContract } from "../../lib/componentContract";

export const CONTRACT = defineContract({
    name: "pricing",
    version: "1.0.0",
    category: "domain",
    description: "Pricing groups, resource pricing, holidays, discounts, surcharges, and price calculations",

    queries: {
        listGroups: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getGroup: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listForResource: {
            args: { resourceId: v.string() },
            returns: v.array(v.any()),
        },
        get: {
            args: { id: v.string() },
            returns: v.any(),
        },
        listByTenant: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        getResourcePricingConfig: {
            args: { resourceId: v.string() },
            returns: v.any(),
        },
        calculatePrice: {
            args: { resourceId: v.string(), startTime: v.number(), endTime: v.number() },
            returns: v.any(),
        },
        calculatePriceWithBreakdown: {
            args: { tenantId: v.string(), resourceId: v.string(), bookingMode: v.string() },
            returns: v.any(),
        },
        listHolidays: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listDiscountCodes: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        validateDiscountCode: {
            args: { tenantId: v.string(), code: v.string() },
            returns: v.any(),
        },
        listWeekdayPricing: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
        listAdditionalServices: {
            args: { tenantId: v.string() },
            returns: v.array(v.any()),
        },
    },

    mutations: {
        createGroup: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateGroup: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        removeGroup: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        create: {
            args: { tenantId: v.string(), resourceId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        update: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        remove: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        createHoliday: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        updateHoliday: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        deleteHoliday: {
            args: { id: v.string() },
            returns: v.object({ success: v.boolean() }),
        },
        createDiscountCode: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
        applyDiscountCode: {
            args: { tenantId: v.string(), code: v.string() },
            returns: v.any(),
        },
        createWeekdayPricing: {
            args: { tenantId: v.string() },
            returns: v.object({ id: v.string() }),
        },
    },

    emits: [
        "pricing.pricing.created",
        "pricing.pricing.updated",
        "pricing.pricing.deleted",
        "pricing.discount.applied",
        "pricing.holiday.created",
    ],

    subscribes: [
        "resources.resource.deleted",
    ],

    dependencies: {
        core: ["tenants", "resources"],
        components: [],
    },
});
