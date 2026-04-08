/**
 * Pricing Component — Price Calculation Functions
 *
 * Contains calculatePrice (simple) and calculatePriceWithBreakdown (full),
 * plus all helper functions used by the calculation logic.
 */

import { query } from "./_generated/server";
import { v } from "convex/values";

// =============================================================================
// Helper functions
// =============================================================================

/** Convert time string "HH:MM" to minutes since midnight */
function timeToMinutesHelper(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
}

/** Get day label for surcharge display */
function getDayLabelHelper(dayOfWeek: number): string {
    const days = ['Søndagstillegg', 'Mandagstillegg', 'Tirsdagstillegg', 'Onsdagstillegg', 'Torsdagstillegg', 'Fredagstillegg', 'Lørdagstillegg'];
    return days[dayOfWeek] || '';
}

/** Format a Date to local YYYY-MM-DD (avoids UTC shift from toISOString) */
function formatLocalDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Validate booking constraints against pricing config */
function validateConstraints(
    pricing: any,
    bookingMode: string,
    durationMinutes: number,
    attendees: number
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Duration constraints
    if (pricing.minDuration && durationMinutes < pricing.minDuration) {
        const minHours = pricing.minDuration / 60;
        errors.push(`Minimum varighet er ${minHours >= 1 ? `${minHours} time${minHours > 1 ? 'r' : ''}` : `${pricing.minDuration} min`}`);
    }
    if (pricing.maxDuration && durationMinutes > pricing.maxDuration) {
        const maxHours = pricing.maxDuration / 60;
        errors.push(`Maksimum varighet er ${maxHours >= 1 ? `${maxHours} time${maxHours > 1 ? 'r' : ''}` : `${pricing.maxDuration} min`}`);
    }

    // People constraints
    if (pricing.minPeople && attendees < pricing.minPeople) {
        errors.push(`Minimum ${pricing.minPeople} personer kreves`);
    }
    if (pricing.maxPeople && attendees > pricing.maxPeople) {
        errors.push(`Maksimum ${pricing.maxPeople} personer tillatt`);
    }

    return { valid: errors.length === 0, errors };
}

// =============================================================================
// EXPLANATION STRATEGIES
// =============================================================================

type ExplanationBuilder = (pricing: any, currency: string) => string;

const EXPLANATION_BUILDERS: Record<string, ExplanationBuilder> = {
    per_hour: (pricing, currency) =>
        `Prisen beregnes basert på varighet: ${(pricing.pricePerHour ?? 0).toLocaleString('nb-NO')} ${currency} per time.`,
    hourly: (pricing, currency) =>
        `Prisen beregnes basert på varighet: ${(pricing.pricePerHour ?? 0).toLocaleString('nb-NO')} ${currency} per time.`,
    per_day: (pricing, currency) =>
        `Dagspris: ${(pricing.pricePerDay ?? 0).toLocaleString('nb-NO')} ${currency} per dag.`,
    daily: (pricing, currency) =>
        `Dagspris: ${(pricing.pricePerDay ?? 0).toLocaleString('nb-NO')} ${currency} per dag.`,
    per_person: (pricing, currency) =>
        `Prisen beregnes per person: ${(pricing.pricePerPerson ?? 0).toLocaleString('nb-NO')} ${currency} per person.`,
    per_person_hour: (pricing, currency) =>
        `Prisen beregnes per person per time: ${(pricing.pricePerPersonHour ?? 0).toLocaleString('nb-NO')} ${currency}.`,
    sport_slot: () =>
        'Velg varighet for din sportstid. Prisen varierer basert på valgt tidsperiode.',
    per_week: (pricing, currency) =>
        `Ukespris: ${(pricing.pricePerWeek ?? 0).toLocaleString('nb-NO')} ${currency} per uke.`,
    weekly: (pricing, currency) =>
        `Ukespris: ${(pricing.pricePerWeek ?? 0).toLocaleString('nb-NO')} ${currency} per uke.`,
    per_month: (pricing, currency) =>
        `Månedspris: ${(pricing.pricePerMonth ?? 0).toLocaleString('nb-NO')} ${currency} per måned.`,
    monthly: (pricing, currency) =>
        `Månedspris: ${(pricing.pricePerMonth ?? 0).toLocaleString('nb-NO')} ${currency} per måned.`,
    per_booking: () =>
        'Fast pris per booking, uavhengig av varighet eller antall deltakere.',
    per_session: () =>
        'Fast pris per booking, uavhengig av varighet eller antall deltakere.',
};

const DEFAULT_EXPLANATION: ExplanationBuilder = () =>
    'Fast pris per booking, uavhengig av varighet eller antall deltakere.';

/** Build explanation text for price breakdown */
function buildExplanation(
    priceType: string,
    pricing: any,
    _bookingMode: string,
    _durationMinutes: number,
    _attendees: number,
    currency: string
): string {
    const builder = EXPLANATION_BUILDERS[priceType] ?? DEFAULT_EXPLANATION;
    const parts: string[] = [builder(pricing, currency)];

    if (pricing.cleaningFee) {
        parts.push(`Inkluderer rengjøringsgebyr: ${pricing.cleaningFee.toLocaleString('nb-NO')} ${currency}.`);
    }

    if (pricing.depositAmount) {
        parts.push(`Depositum (refunderbart): ${pricing.depositAmount.toLocaleString('nb-NO')} ${currency}.`);
    }

    return parts.join(' ');
}

// =============================================================================
// SURCHARGE STRATEGIES
// =============================================================================

type SurchargeApplier = (baseAmount: number, surchargeValue: number) => number;

const SURCHARGE_APPLIERS: Record<string, SurchargeApplier> = {
    percent: (baseAmount, surchargeValue) => baseAmount * (surchargeValue / 100),
    fixed: (_baseAmount, surchargeValue) => surchargeValue,
    multiplier: (baseAmount, surchargeValue) => baseAmount * (surchargeValue - 1),
};

/** Apply a surcharge to a base amount */
function applySurcharge(
    baseAmount: number,
    surchargeType: string,
    surchargeValue: number
): number {
    const applier = SURCHARGE_APPLIERS[surchargeType];
    return applier ? applier(baseAmount, surchargeValue) : 0;
}

// =============================================================================
// PRICE CALCULATION — Simple (original calculatePrice)
// =============================================================================

/**
 * Calculate price for a booking.
 * Facade must validate resource existence before calling.
 * Uses additionalServices (component-internal) instead of external addons table.
 */
export const calculatePrice = query({
    args: {
        resourceId: v.string(),
        startTime: v.number(),
        endTime: v.number(),
        userId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        additionalServiceIds: v.optional(v.array(v.id("additionalServices"))),
    },
    returns: v.any(),
    handler: async (ctx, { resourceId, startTime, endTime, userId, organizationId, additionalServiceIds }) => {
        // Get default pricing for resource
        const pricing = await ctx.db
            .query("resourcePricing")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .first();

        if (!pricing) {
            throw new Error("No pricing configured for resource");
        }

        // Calculate duration
        const durationMs = endTime - startTime;
        const durationHours = durationMs / (1000 * 60 * 60);
        const durationDays = durationHours / 24;

        // Base price calculation
        let baseTotal = 0;
        if (pricing.priceType === "hourly" && pricing.pricePerHour) {
            baseTotal = durationHours * pricing.pricePerHour;
        } else if (pricing.priceType === "daily" && pricing.pricePerDay) {
            baseTotal = Math.ceil(durationDays) * pricing.pricePerDay;
        } else {
            baseTotal = pricing.basePrice;
        }

        // Check for user/org pricing group discount
        let discountPercent = 0;
        if (organizationId) {
            const orgPricing = await ctx.db
                .query("orgPricingGroups")
                .withIndex("by_organization", (q) => q.eq("organizationId", organizationId))
                .filter((q) => q.eq(q.field("isActive"), true))
                .first();

            if (orgPricing?.discountPercent) {
                discountPercent = orgPricing.discountPercent;
            }
        } else if (userId) {
            const userPricing = await ctx.db
                .query("userPricingGroups")
                .withIndex("by_user", (q) => q.eq("userId", userId))
                .filter((q) => q.eq(q.field("isActive"), true))
                .first();

            if (userPricing) {
                const group = await ctx.db.get(userPricing.pricingGroupId);
                if (group?.discountPercent) {
                    discountPercent = group.discountPercent;
                }
            }
        }

        const discountAmount = (baseTotal * discountPercent) / 100;
        const subtotal = baseTotal - discountAmount;

        // Add additional services (component-internal equivalent of addons)
        let addonsTotal = 0;
        const addonsBreakdown: { addonId: string; name: string; price: number }[] = [];

        if (additionalServiceIds && additionalServiceIds.length > 0) {
            for (const serviceId of additionalServiceIds) {
                const service = await ctx.db.get(serviceId);
                if (service && service.isActive) {
                    addonsTotal += service.price;
                    addonsBreakdown.push({
                        addonId: service._id as string,
                        name: service.name,
                        price: service.price,
                    });
                }
            }
        }

        // Add fees
        const cleaningFee = pricing.cleaningFee ?? 0;
        const depositAmount = pricing.depositAmount ?? 0;

        const total = subtotal + addonsTotal + cleaningFee;

        return {
            breakdown: {
                basePrice: baseTotal,
                discountPercent,
                discountAmount,
                subtotal,
                addons: addonsBreakdown,
                addonsTotal,
                cleaningFee,
                depositAmount,
            },
            total,
            currency: pricing.currency,
            durationHours,
            // Pricing details for display
            pricingDetails: {
                priceType: pricing.priceType,
                pricePerHour: pricing.pricePerHour,
                pricePerDay: pricing.pricePerDay,
                basePrice: pricing.basePrice,
                minDuration: pricing.minDuration,
                maxDuration: pricing.maxDuration,
            },
        };
    },
});

// =============================================================================
// PRICE CALCULATION STRATEGIES
// =============================================================================

type PriceLineItem = { type: string; label: string; quantity?: number; unit?: string; unitPrice?: number; amount: number; calculation?: string };
type PriceCalcArgs = { durationMinutes: number; attendees: number; pricing: any; currency: string; selectedSlotMinutes?: number };
type PriceCalcResult = { items: PriceLineItem[]; subtotal: number };
type PriceCalculator = (args: PriceCalcArgs) => PriceCalcResult;

const PRICE_CALCULATORS: Record<string, PriceCalculator> = {
    per_hour: ({ durationMinutes, pricing, currency }) => {
        const hours = durationMinutes / 60;
        const pricePerHour = pricing.pricePerHour ?? pricing.basePrice ?? 0;
        const amount = Math.round(hours * pricePerHour);
        return {
            items: [{
                type: 'duration',
                label: 'Timeleie',
                quantity: hours,
                unit: hours === 1 ? 'time' : 'timer',
                unitPrice: pricePerHour,
                amount,
                calculation: `${hours} ${hours === 1 ? 'time' : 'timer'} × ${pricePerHour.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    hourly: (...args) => PRICE_CALCULATORS.per_hour(...args),

    per_day: ({ durationMinutes, pricing, currency }) => {
        const days = Math.ceil(durationMinutes / (24 * 60)) || 1;
        const pricePerDay = pricing.pricePerDay ?? pricing.basePrice ?? 0;
        const amount = Math.round(days * pricePerDay);
        return {
            items: [{
                type: 'duration',
                label: 'Dagsleie',
                quantity: days,
                unit: days === 1 ? 'dag' : 'dager',
                unitPrice: pricePerDay,
                amount,
                calculation: `${days} ${days === 1 ? 'dag' : 'dager'} × ${pricePerDay.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    daily: (...args) => PRICE_CALCULATORS.per_day(...args),

    per_half_day: ({ durationMinutes, pricing, currency }) => {
        const halfDays = Math.ceil(durationMinutes / (4 * 60)) || 1;
        const pricePerHalfDay = pricing.pricePerHalfDay ?? pricing.basePrice ?? 0;
        const amount = Math.round(halfDays * pricePerHalfDay);
        return {
            items: [{
                type: 'duration',
                label: 'Halvdagsleie',
                quantity: halfDays,
                unit: 'halvdag',
                unitPrice: pricePerHalfDay,
                amount,
                calculation: `${halfDays} halvdag × ${pricePerHalfDay.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    per_week: ({ durationMinutes, pricing, currency }) => {
        const weeks = Math.ceil(durationMinutes / (7 * 24 * 60)) || 1;
        const pricePerWeek = pricing.pricePerWeek ?? pricing.basePrice ?? 0;
        const amount = Math.round(weeks * pricePerWeek);
        return {
            items: [{
                type: 'duration',
                label: 'Ukesleie',
                quantity: weeks,
                unit: weeks === 1 ? 'uke' : 'uker',
                unitPrice: pricePerWeek,
                amount,
                calculation: `${weeks} ${weeks === 1 ? 'uke' : 'uker'} × ${pricePerWeek.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    weekly: (...args) => PRICE_CALCULATORS.per_week(...args),

    per_month: ({ durationMinutes, pricing, currency }) => {
        const months = Math.ceil(durationMinutes / (30 * 24 * 60)) || 1;
        const pricePerMonth = pricing.pricePerMonth ?? pricing.basePrice ?? 0;
        const amount = Math.round(months * pricePerMonth);
        return {
            items: [{
                type: 'duration',
                label: 'Månedsleie',
                quantity: months,
                unit: months === 1 ? 'måned' : 'måneder',
                unitPrice: pricePerMonth,
                amount,
                calculation: `${months} ${months === 1 ? 'måned' : 'måneder'} × ${pricePerMonth.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    monthly: (...args) => PRICE_CALCULATORS.per_month(...args),

    per_person: ({ attendees, pricing, currency }) => {
        const people = attendees || 1;
        const pricePerPerson = pricing.pricePerPerson ?? pricing.basePrice ?? 0;
        const amount = Math.round(people * pricePerPerson);
        return {
            items: [{
                type: 'person',
                label: 'Pris per person',
                quantity: people,
                unit: people === 1 ? 'person' : 'personer',
                unitPrice: pricePerPerson,
                amount,
                calculation: `${people} ${people === 1 ? 'person' : 'personer'} × ${pricePerPerson.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    per_person_hour: ({ durationMinutes, attendees, pricing, currency }) => {
        const hours = durationMinutes / 60;
        const people = attendees || 1;
        const pricePerPersonHour = pricing.pricePerPersonHour ?? pricing.basePrice ?? 0;
        const amount = Math.round(hours * people * pricePerPersonHour);
        return {
            items: [{
                type: 'person',
                label: 'Pris per person/time',
                quantity: people,
                unit: 'personer',
                unitPrice: pricePerPersonHour,
                amount,
                calculation: `${people} pers. × ${hours} timer × ${pricePerPersonHour.toLocaleString('nb-NO')} ${currency}`,
            }],
            subtotal: amount,
        };
    },

    sport_slot: ({ durationMinutes, pricing, selectedSlotMinutes }) => {
        const slotOptions = pricing.slotOptions ?? [];
        const targetMinutes = selectedSlotMinutes ?? durationMinutes;
        const exactMatchSlot = slotOptions.find((o: any) => o.minutes === targetMinutes);

        if (exactMatchSlot) {
            const hours = exactMatchSlot.minutes / 60;
            return {
                items: [{
                    type: 'duration',
                    label: hours >= 1
                        ? `${hours} ${hours === 1 ? 'time' : 'timer'}`
                        : `${exactMatchSlot.minutes} min`,
                    amount: exactMatchSlot.price,
                }],
                subtotal: exactMatchSlot.price,
            };
        }

        const hours = durationMinutes / 60;
        const hourlyRate = pricing.pricePerHour ?? pricing.basePrice ?? 280;
        const calculatedPrice = Math.round(hours * hourlyRate);
        return {
            items: [{
                type: 'duration',
                label: hours >= 1
                    ? `${hours} ${hours === 1 ? 'time' : 'timer'}`
                    : `${durationMinutes} min`,
                quantity: hours,
                unit: hours === 1 ? 'time' : 'timer',
                unitPrice: hourlyRate,
                amount: calculatedPrice,
            }],
            subtotal: calculatedPrice,
        };
    },

    per_booking: ({ pricing }) => {
        const basePrice = pricing.basePrice ?? 0;
        return {
            items: [{
                type: 'base',
                label: 'Fast pris',
                amount: basePrice,
                calculation: 'Fast pris per booking',
            }],
            subtotal: basePrice,
        };
    },

    per_session: (...args) => PRICE_CALCULATORS.per_booking(...args),

    _default: (...args) => PRICE_CALCULATORS.per_booking(...args),
};

// =============================================================================
// PRICE CALCULATION — Full breakdown (calculatePriceWithBreakdown)
// =============================================================================

/**
 * Calculate price with full breakdown including surcharges, discounts, and tax.
 *
 * The facade passes tenantId and resourceCategoryKey since the component
 * cannot read the resources table. The facade validates resource existence.
 */
export const calculatePriceWithBreakdown = query({
    args: {
        tenantId: v.string(),
        resourceId: v.string(),
        bookingMode: v.string(), // SLOTS, ALL_DAY, DURATION, TICKETS
        durationMinutes: v.number(),
        attendees: v.number(),
        tickets: v.optional(v.number()),
        priceGroupId: v.optional(v.id("pricingGroups")),
        selectedSlotMinutes: v.optional(v.number()), // For sport_slot mode
        // New fields for surcharges
        bookingDate: v.optional(v.number()),         // Timestamp of booking
        bookingTime: v.optional(v.string()),         // Start time like "14:00"
        discountCode: v.optional(v.string()),        // Discount/coupon code
        userId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        // Component-specific: passed by facade since we can't read resources table
        resourceCategoryKey: v.optional(v.string()),
    },
    returns: v.any(),
    handler: async (ctx, args) => {
        const { tenantId, resourceId, bookingMode, durationMinutes, attendees, tickets, priceGroupId, selectedSlotMinutes,
                bookingDate, bookingTime, discountCode, userId, organizationId, resourceCategoryKey } = args;

        // Get pricing config
        const pricingConfigs = await ctx.db
            .query("resourcePricing")
            .withIndex("by_resource", (q) => q.eq("resourceId", resourceId))
            .filter((q) => q.eq(q.field("isActive"), true))
            .collect();

        if (pricingConfigs.length === 0) {
            return {
                items: [],
                surcharges: [],
                subtotal: 0,
                discounts: [],
                subtotalAfterDiscount: 0,
                taxAmount: 0,
                taxRate: 0.25,
                total: 0,
                currency: 'NOK',
                deposit: undefined,
                summary: 'Pris på forespørsel',
                explanation: 'Ingen priskonfigurasjon funnet for denne ressursen.',
                pricingModel: 'per_booking',
                validation: { valid: false, errors: ['Ingen priskonfigurasjon funnet'] },
            };
        }

        // Find the most applicable pricing config
        let pricing = pricingConfigs[0];
        const modeSpecific = pricingConfigs.find(p =>
            p.applicableBookingModes?.includes(bookingMode)
        );
        if (modeSpecific) {
            pricing = modeSpecific;
        }

        // Get price group discount
        let priceGroupDiscount = 0;
        let priceGroupLabel = '';
        if (priceGroupId) {
            const priceGroup = await ctx.db.get(priceGroupId);
            if (priceGroup && priceGroup.isActive) {
                priceGroupDiscount = priceGroup.discountPercent ?? 0;
                priceGroupLabel = priceGroup.name;
            }
        }

        const currency = pricing.currency || 'NOK';
        const taxRate = pricing.taxRate ?? 0.25;
        const items: Array<{ type: string; label: string; quantity?: number; unit?: string; unitPrice?: number; amount: number; calculation?: string }> = [];
        const surchargeItems: Array<{ type: string; label: string; surchargeType: string; amount: number }> = [];
        let subtotal = 0;

        // Calculate based on price type using strategy pattern
        const priceType = pricing.priceType;
        const calculator = PRICE_CALCULATORS[priceType] ?? PRICE_CALCULATORS._default;
        const calcResult = calculator({ durationMinutes, attendees, pricing, currency, selectedSlotMinutes });
        items.push(...calcResult.items);
        subtotal += calcResult.subtotal;

        // Handle TICKETS mode specially
        if (bookingMode === 'TICKETS' && tickets && tickets > 0) {
            const ticketPrice = pricing.pricePerPerson ?? pricing.basePrice ?? 0;
            items.length = 0;
            const ticketAmount = Math.round(tickets * ticketPrice);
            items.push({
                type: 'ticket',
                label: 'Billetter',
                quantity: tickets,
                unit: tickets === 1 ? 'billett' : 'billetter',
                unitPrice: ticketPrice,
                amount: ticketAmount,
                calculation: `${tickets} ${tickets === 1 ? 'billett' : 'billetter'} × ${ticketPrice.toLocaleString('nb-NO')} ${currency}`,
            });
            subtotal = ticketAmount;
        }

        // Add fees
        if (pricing.cleaningFee && pricing.cleaningFee > 0) {
            items.push({
                type: 'fee',
                label: 'Rengjøringsgebyr',
                amount: pricing.cleaningFee,
            });
            subtotal += pricing.cleaningFee;
        }

        if (pricing.serviceFee && pricing.serviceFee > 0) {
            items.push({
                type: 'fee',
                label: 'Servicegebyr',
                amount: pricing.serviceFee,
            });
            subtotal += pricing.serviceFee;
        }

        // =====================================================================
        // APPLY SURCHARGES (Holidays & Weekday pricing)
        // =====================================================================
        let surchargeTotal = 0;

        if (bookingDate) {
            const date = new Date(bookingDate);
            const dayOfWeek = date.getDay();
            const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            const fullDate = formatLocalDate(date);

            // Check holidays (uses tenantId passed by facade)
            const holidays = await ctx.db
                .query("holidays")
                .withIndex("by_tenant", (q) => q.eq("tenantId", tenantId))
                .filter((q) => q.eq(q.field("isActive"), true))
                .collect();

            for (const holiday of holidays) {
                const matchesDate = holiday.isRecurring
                    ? holiday.date === monthDay
                    : holiday.date === fullDate;

                if (matchesDate) {
                    const appliesToResource = !holiday.appliesToResources ||
                        holiday.appliesToResources.length === 0 ||
                        holiday.appliesToResources.includes(resourceId);

                    const appliesToCategory = !holiday.appliesToCategories ||
                        holiday.appliesToCategories.length === 0 ||
                        (resourceCategoryKey && holiday.appliesToCategories.includes(resourceCategoryKey));

                    if (appliesToResource && appliesToCategory) {
                        let surchargeAmount = 0;
                        if (holiday.surchargeType === 'percent') {
                            surchargeAmount = Math.round(subtotal * (holiday.surchargeValue / 100));
                        } else if (holiday.surchargeType === 'fixed') {
                            surchargeAmount = holiday.surchargeValue;
                        } else if (holiday.surchargeType === 'multiplier') {
                            surchargeAmount = Math.round(subtotal * (holiday.surchargeValue - 1));
                        }

                        if (surchargeAmount > 0) {
                            surchargeItems.push({
                                type: 'holiday',
                                label: holiday.name,
                                surchargeType: holiday.surchargeType,
                                amount: surchargeAmount,
                            });
                            surchargeTotal += surchargeAmount;
                        }
                    }
                }
            }

            // Check weekday pricing (uses tenantId passed by facade)
            const weekdayRules = await ctx.db
                .query("weekdayPricing")
                .withIndex("by_tenant_day", (q) => q.eq("tenantId", tenantId).eq("dayOfWeek", dayOfWeek))
                .filter((q) => q.eq(q.field("isActive"), true))
                .collect();

            for (const rule of weekdayRules) {
                if (rule.resourceId && rule.resourceId !== resourceId) {
                    continue;
                }

                // Check time-based rules
                if (rule.startTime && rule.endTime && bookingTime) {
                    const bookingMinutes = timeToMinutesHelper(bookingTime);
                    const startMinutes = timeToMinutesHelper(rule.startTime);
                    const endMinutes = timeToMinutesHelper(rule.endTime);

                    if (bookingMinutes < startMinutes || bookingMinutes >= endMinutes) {
                        continue;
                    }
                }

                let surchargeAmount = 0;
                if (rule.surchargeType === 'percent') {
                    surchargeAmount = Math.round(subtotal * (rule.surchargeValue / 100));
                } else if (rule.surchargeType === 'fixed') {
                    surchargeAmount = rule.surchargeValue;
                } else if (rule.surchargeType === 'multiplier') {
                    surchargeAmount = Math.round(subtotal * (rule.surchargeValue - 1));
                }

                if (surchargeAmount > 0) {
                    surchargeItems.push({
                        type: rule.startTime ? 'peak' : 'weekday',
                        label: rule.label || getDayLabelHelper(dayOfWeek),
                        surchargeType: rule.surchargeType,
                        amount: surchargeAmount,
                    });
                    surchargeTotal += surchargeAmount;
                }
            }
        }

        // Add surcharges to subtotal
        const subtotalWithSurcharges = subtotal + surchargeTotal;

        // =====================================================================
        // APPLY DISCOUNTS (Price group + Discount code)
        // =====================================================================
        const discounts: Array<{ label: string; type: string; percent?: number; amount: number }> = [];
        let totalDiscountAmount = 0;

        // Price group discount
        if (priceGroupDiscount > 0) {
            const discountAmount = Math.round(subtotalWithSurcharges * (priceGroupDiscount / 100));
            discounts.push({
                label: priceGroupLabel || 'Prisgruppe-rabatt',
                type: 'price_group',
                percent: priceGroupDiscount,
                amount: discountAmount,
            });
            totalDiscountAmount += discountAmount;
        }

        // Discount code
        let discountCodeInfo = null;
        if (discountCode) {
            const codeRecord = await ctx.db
                .query("discountCodes")
                .withIndex("by_code", (q) => q.eq("tenantId", tenantId).eq("code", discountCode.toUpperCase()))
                .first();

            if (codeRecord && codeRecord.isActive) {
                const now = Date.now();
                const isValidDate = (!codeRecord.validFrom || codeRecord.validFrom <= now) &&
                                   (!codeRecord.validUntil || codeRecord.validUntil >= now);
                const hasUsesLeft = !codeRecord.maxUsesTotal || codeRecord.currentUses < codeRecord.maxUsesTotal;

                if (isValidDate && hasUsesLeft) {
                    let codeDiscountAmount = 0;

                    if (codeRecord.discountType === 'percent') {
                        codeDiscountAmount = Math.round(subtotalWithSurcharges * (codeRecord.discountValue / 100));
                    } else if (codeRecord.discountType === 'fixed') {
                        codeDiscountAmount = codeRecord.discountValue;
                    } else if (codeRecord.discountType === 'free_hours') {
                        // Calculate value of free hours
                        const hourlyRate = pricing.pricePerHour ?? (pricing.basePrice ?? 0) / (durationMinutes / 60);
                        codeDiscountAmount = Math.round(hourlyRate * codeRecord.discountValue);
                    }

                    // Apply max discount cap
                    if (codeRecord.maxDiscountAmount && codeDiscountAmount > codeRecord.maxDiscountAmount) {
                        codeDiscountAmount = codeRecord.maxDiscountAmount;
                    }

                    if (codeDiscountAmount > 0) {
                        discounts.push({
                            label: `${codeRecord.name} (${codeRecord.code})`,
                            type: 'discount_code',
                            percent: codeRecord.discountType === 'percent' ? codeRecord.discountValue : undefined,
                            amount: codeDiscountAmount,
                        });
                        totalDiscountAmount += codeDiscountAmount;
                        discountCodeInfo = {
                            id: codeRecord._id,
                            code: codeRecord.code,
                            name: codeRecord.name,
                        };
                    }
                }
            }
        }

        const subtotalAfterDiscount = Math.max(0, subtotalWithSurcharges - totalDiscountAmount);

        // Calculate tax
        const taxAmount = Math.round(subtotalAfterDiscount * taxRate);
        const total = subtotalAfterDiscount + taxAmount;

        // Validate constraints
        const validation = validateConstraints(pricing, bookingMode, durationMinutes, attendees);

        // Build explanation
        const explanation = buildExplanation(priceType, pricing, bookingMode, durationMinutes, attendees, currency);

        return {
            items,
            surcharges: surchargeItems,
            subtotal,
            surchargeTotal,
            subtotalWithSurcharges,
            discounts,
            totalDiscountAmount,
            subtotalAfterDiscount,
            taxAmount,
            taxRate,
            total,
            currency,
            deposit: pricing.depositAmount,
            summary: `${total.toLocaleString('nb-NO')} ${currency} (inkl. MVA)`,
            explanation,
            pricingModel: priceType,
            validation,
            discountCodeApplied: discountCodeInfo,
            // Slot options for UI (sport_slot mode)
            slotOptions: pricing.slotOptions ?? [],
            // Constraints for UI
            constraints: {
                minDurationMinutes: pricing.minDuration,
                maxDurationMinutes: pricing.maxDuration,
                minPeople: pricing.minPeople,
                maxPeople: pricing.maxPeople,
                slotDurationMinutes: pricing.slotDurationMinutes,
            },
        };
    },
});
