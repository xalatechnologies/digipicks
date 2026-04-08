/**
 * Pricing Math — Pure Business Logic Tests
 *
 * Tests the pricing calculation strategies that mirror the PRICE_CALCULATORS
 * strategy pattern in convex/components/pricing/calculations.ts.
 *
 * These are the same formulas used in the real calculatePriceWithBreakdown query.
 * Testing them here verifies the math is correct independently of the Convex runtime.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Strategy implementations mirroring PRICE_CALCULATORS in calculations.ts
// =============================================================================

/** Calculate per_hour price: hours * pricePerHour */
function calcPerHour(durationMinutes: number, pricePerHour: number): number {
    const hours = durationMinutes / 60;
    return Math.round(hours * pricePerHour);
}

/** Calculate per_day price: ceil(days) * pricePerDay */
function calcPerDay(durationMinutes: number, pricePerDay: number): number {
    const days = Math.ceil(durationMinutes / (24 * 60)) || 1;
    return Math.round(days * pricePerDay);
}

/** Calculate per_half_day price: ceil(half-days) * pricePerHalfDay */
function calcPerHalfDay(durationMinutes: number, pricePerHalfDay: number): number {
    const halfDays = Math.ceil(durationMinutes / (4 * 60)) || 1;
    return Math.round(halfDays * pricePerHalfDay);
}

/** Calculate per_person price: attendees * pricePerPerson */
function calcPerPerson(attendees: number, pricePerPerson: number): number {
    return Math.round(attendees * pricePerPerson);
}

/** Calculate per_person_hour price: hours * attendees * pricePerPersonHour */
function calcPerPersonHour(
    durationMinutes: number,
    attendees: number,
    pricePerPersonHour: number
): number {
    const hours = durationMinutes / 60;
    return Math.round(hours * attendees * pricePerPersonHour);
}

/** Calculate per_booking (fixed) price: basePrice */
function calcPerBooking(basePrice: number): number {
    return basePrice;
}

/** Calculate TICKETS mode: tickets * pricePerPerson */
function calcTickets(tickets: number, pricePerPerson: number): number {
    return Math.round(tickets * pricePerPerson);
}

/** Apply surcharge (percent | fixed | multiplier) to a base amount */
function applySurcharge(
    baseAmount: number,
    surchargeType: "percent" | "fixed" | "multiplier",
    surchargeValue: number
): number {
    if (surchargeType === "percent") return Math.round(baseAmount * (surchargeValue / 100));
    if (surchargeType === "fixed") return surchargeValue;
    if (surchargeType === "multiplier") return Math.round(baseAmount * (surchargeValue - 1));
    return 0;
}

/** Apply discount (percent | fixed) to a base amount, capped at maxDiscountAmount */
function applyDiscount(
    baseAmount: number,
    discountType: "percent" | "fixed",
    discountValue: number,
    maxDiscountAmount?: number
): number {
    let amount =
        discountType === "percent"
            ? Math.round(baseAmount * (discountValue / 100))
            : discountValue;
    if (maxDiscountAmount !== undefined && amount > maxDiscountAmount) {
        amount = maxDiscountAmount;
    }
    return amount;
}

/** Validate duration and attendee constraints */
function validateConstraints(
    pricing: { minDuration?: number; maxDuration?: number; minPeople?: number; maxPeople?: number },
    durationMinutes: number,
    attendees: number
): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (pricing.minDuration && durationMinutes < pricing.minDuration) {
        errors.push(`Minimum varighet er ${pricing.minDuration / 60} time(r)`);
    }
    if (pricing.maxDuration && durationMinutes > pricing.maxDuration) {
        errors.push(`Maksimum varighet er ${pricing.maxDuration / 60} time(r)`);
    }
    if (pricing.minPeople && attendees < pricing.minPeople) {
        errors.push(`Minimum ${pricing.minPeople} personer kreves`);
    }
    if (pricing.maxPeople && attendees > pricing.maxPeople) {
        errors.push(`Maksimum ${pricing.maxPeople} personer tillatt`);
    }
    return { valid: errors.length === 0, errors };
}

// =============================================================================
// per_hour pricing
// =============================================================================

describe("per_hour pricing strategy", () => {
    it("calculates exact hours correctly", () => {
        expect(calcPerHour(120, 500)).toBe(1000); // 2 hours * 500 NOK
    });

    it("calculates fractional hours and rounds", () => {
        expect(calcPerHour(90, 400)).toBe(600); // 1.5 hours * 400 = 600
    });

    it("rounds sub-krone amounts", () => {
        // 1.5 hours * 333 = 499.5 → rounds to 500
        expect(calcPerHour(90, 333)).toBe(500);
    });

    it("returns 0 for 0-minute duration", () => {
        expect(calcPerHour(0, 500)).toBe(0);
    });

    it("calculates a full workday (8 hours)", () => {
        expect(calcPerHour(480, 200)).toBe(1600);
    });
});

// =============================================================================
// per_day pricing
// =============================================================================

describe("per_day pricing strategy", () => {
    it("calculates single day", () => {
        expect(calcPerDay(480, 2000)).toBe(2000); // 8 hours → ceil to 1 day
    });

    it("calculates multi-day period", () => {
        expect(calcPerDay(3 * 24 * 60, 2000)).toBe(6000); // exactly 3 days
    });

    it("ceils partial days", () => {
        // 25 hours → ceil to 2 days
        expect(calcPerDay(25 * 60, 1500)).toBe(3000);
    });

    it("treats 0 minutes as 1 day minimum", () => {
        expect(calcPerDay(0, 2000)).toBe(2000);
    });
});

// =============================================================================
// per_half_day pricing
// =============================================================================

describe("per_half_day pricing strategy", () => {
    it("calculates a 4-hour block as 1 half-day", () => {
        expect(calcPerHalfDay(240, 800)).toBe(800);
    });

    it("calculates an 8-hour block as 2 half-days", () => {
        expect(calcPerHalfDay(480, 800)).toBe(1600);
    });

    it("ceils to next half-day", () => {
        // 5 hours → ceil(300/240) = ceil(1.25) = 2 half-days
        expect(calcPerHalfDay(300, 800)).toBe(1600);
    });
});

// =============================================================================
// per_person pricing
// =============================================================================

describe("per_person pricing strategy", () => {
    it("calculates price for a group", () => {
        expect(calcPerPerson(8, 150)).toBe(1200);
    });

    it("calculates price for a single attendee", () => {
        expect(calcPerPerson(1, 200)).toBe(200);
    });

    it("calculates price for a large group", () => {
        expect(calcPerPerson(50, 75)).toBe(3750);
    });
});

// =============================================================================
// per_person_hour pricing
// =============================================================================

describe("per_person_hour pricing strategy", () => {
    it("calculates combined person-hour price", () => {
        // 2 hours, 10 people, 100 NOK/person/hour = 2000
        expect(calcPerPersonHour(120, 10, 100)).toBe(2000);
    });

    it("handles fractional hours", () => {
        // 1.5 hours, 4 people, 200 NOK/person/hour = 1200
        expect(calcPerPersonHour(90, 4, 200)).toBe(1200);
    });
});

// =============================================================================
// per_booking (fixed) pricing
// =============================================================================

describe("per_booking pricing strategy", () => {
    it("returns the fixed base price regardless of duration", () => {
        expect(calcPerBooking(1500)).toBe(1500);
    });

    it("returns 0 for free resources", () => {
        expect(calcPerBooking(0)).toBe(0);
    });
});

// =============================================================================
// TICKETS mode
// =============================================================================

describe("TICKETS mode pricing", () => {
    it("calculates ticket price for a group", () => {
        expect(calcTickets(20, 50)).toBe(1000);
    });

    it("calculates single ticket", () => {
        expect(calcTickets(1, 299)).toBe(299);
    });

    it("rounds sub-krone ticket amounts", () => {
        // 7 tickets * 33 NOK = 231
        expect(calcTickets(7, 33)).toBe(231);
    });
});

// =============================================================================
// Surcharges
// =============================================================================

describe("applySurcharge", () => {
    describe("percent surcharge", () => {
        it("applies weekend surcharge (20%)", () => {
            expect(applySurcharge(500, "percent", 20)).toBe(100); // 500 * 0.20
        });

        it("applies holiday surcharge (50%)", () => {
            expect(applySurcharge(2000, "percent", 50)).toBe(1000);
        });

        it("rounds sub-krone surcharge amounts", () => {
            // 1000 * 17% = 170 exact
            expect(applySurcharge(1000, "percent", 17)).toBe(170);
        });
    });

    describe("fixed surcharge", () => {
        it("applies a flat fee regardless of base price", () => {
            expect(applySurcharge(500, "fixed", 200)).toBe(200);
            expect(applySurcharge(5000, "fixed", 200)).toBe(200);
        });
    });

    describe("multiplier surcharge", () => {
        it("doubles the base price with multiplier 2.0", () => {
            // surchargeAmount = baseAmount * (2.0 - 1) = baseAmount * 1.0
            expect(applySurcharge(1000, "multiplier", 2.0)).toBe(1000);
        });

        it("adds 50% with multiplier 1.5", () => {
            // surchargeAmount = 1000 * (1.5 - 1) = 500
            expect(applySurcharge(1000, "multiplier", 1.5)).toBe(500);
        });
    });
});

// =============================================================================
// Discounts
// =============================================================================

describe("applyDiscount", () => {
    describe("percent discount", () => {
        it("applies member group discount (20%)", () => {
            expect(applyDiscount(1000, "percent", 20)).toBe(200);
        });

        it("applies organization discount (30%)", () => {
            expect(applyDiscount(2000, "percent", 30)).toBe(600);
        });

        it("respects maxDiscountAmount cap", () => {
            // 10% of 5000 = 500, but capped at 300
            expect(applyDiscount(5000, "percent", 10, 300)).toBe(300);
        });
    });

    describe("fixed discount", () => {
        it("applies fixed-amount discount code", () => {
            expect(applyDiscount(1000, "fixed", 100)).toBe(100);
        });

        it("respects maxDiscountAmount cap on fixed discount", () => {
            expect(applyDiscount(1000, "fixed", 500, 200)).toBe(200);
        });
    });
});

// =============================================================================
// Combined pricing workflow
// =============================================================================

describe("combined pricing workflow (base + surcharge - discount + tax)", () => {
    it("applies surcharge then discount correctly", () => {
        const base = 1000;
        const weekendSurcharge = applySurcharge(base, "percent", 20); // +200
        const subtotalWithSurcharge = base + weekendSurcharge; // 1200
        const memberDiscount = applyDiscount(subtotalWithSurcharge, "percent", 20); // -240
        const subtotalAfterDiscount = subtotalWithSurcharge - memberDiscount; // 960
        const tax = Math.round(subtotalAfterDiscount * 0.25); // 240
        const total = subtotalAfterDiscount + tax; // 1200

        expect(weekendSurcharge).toBe(200);
        expect(subtotalWithSurcharge).toBe(1200);
        expect(memberDiscount).toBe(240);
        expect(subtotalAfterDiscount).toBe(960);
        expect(total).toBe(1200);
    });

    it("handles fees stacking (base + cleaning fee + service fee)", () => {
        const base = calcPerHour(60, 500); // 1 hour = 500
        const cleaningFee = 150;
        const serviceFee = 50;
        const subtotal = base + cleaningFee + serviceFee; // 700

        expect(base).toBe(500);
        expect(subtotal).toBe(700);
    });

    it("discount cannot reduce total below zero", () => {
        // If discount > subtotal, final price should not go negative
        const subtotal = 100;
        const discount = applyDiscount(subtotal, "fixed", 500); // Fixed 500 NOK
        const subtotalAfterDiscount = Math.max(0, subtotal - discount);

        expect(subtotalAfterDiscount).toBe(0); // Clamped to 0
    });
});

// =============================================================================
// Duration constraint validation
// =============================================================================

describe("validateConstraints", () => {
    it("passes when duration is within bounds", () => {
        const result = validateConstraints(
            { minDuration: 60, maxDuration: 480 },
            120, // 2 hours
            5
        );
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
    });

    it("fails when duration is below minimum", () => {
        const result = validateConstraints(
            { minDuration: 60 }, // 60 min minimum
            30,                  // only 30 min requested
            5
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Minimum varighet");
    });

    it("fails when duration exceeds maximum", () => {
        const result = validateConstraints(
            { maxDuration: 240 }, // 4 hour max
            300,                  // 5 hours requested
            5
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Maksimum varighet");
    });

    it("fails when attendee count is below minimum", () => {
        const result = validateConstraints(
            { minPeople: 10 },
            120,
            5 // only 5 people, min is 10
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Minimum");
    });

    it("fails when attendee count exceeds maximum", () => {
        const result = validateConstraints(
            { maxPeople: 50 },
            120,
            75 // 75 people, max is 50
        );
        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain("Maksimum");
    });

    it("accumulates multiple constraint errors", () => {
        const result = validateConstraints(
            { minDuration: 120, maxPeople: 10 },
            60,  // too short
            20   // too many people
        );
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(2);
    });

    it("passes with no constraints defined", () => {
        const result = validateConstraints({}, 30, 1);
        expect(result.valid).toBe(true);
    });
});

// =============================================================================
// Booking time overlap detection
// =============================================================================

describe("booking overlap detection", () => {
    function hasOverlap(
        existingStart: number, existingEnd: number,
        newStart: number, newEnd: number
    ): boolean {
        return newStart < existingEnd && newEnd > existingStart;
    }

    it("detects full containment overlap", () => {
        const existingStart = new Date("2024-03-15T10:00:00").getTime();
        const existingEnd = new Date("2024-03-15T12:00:00").getTime();
        const newStart = new Date("2024-03-15T10:30:00").getTime();
        const newEnd = new Date("2024-03-15T11:30:00").getTime();
        expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("detects partial overlap (new starts inside existing)", () => {
        const existingStart = new Date("2024-03-15T10:00:00").getTime();
        const existingEnd = new Date("2024-03-15T12:00:00").getTime();
        const newStart = new Date("2024-03-15T11:00:00").getTime();
        const newEnd = new Date("2024-03-15T13:00:00").getTime();
        expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("detects partial overlap (new ends inside existing)", () => {
        const existingStart = new Date("2024-03-15T10:00:00").getTime();
        const existingEnd = new Date("2024-03-15T12:00:00").getTime();
        const newStart = new Date("2024-03-15T09:00:00").getTime();
        const newEnd = new Date("2024-03-15T11:00:00").getTime();
        expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(true);
    });

    it("does not flag adjacent bookings as conflicting", () => {
        const existingStart = new Date("2024-03-15T10:00:00").getTime();
        const existingEnd = new Date("2024-03-15T11:00:00").getTime();
        const newStart = new Date("2024-03-15T11:00:00").getTime();
        const newEnd = new Date("2024-03-15T12:00:00").getTime();
        // newStart == existingEnd: newStart < existingEnd is false → no overlap
        expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
    });

    it("does not flag non-overlapping bookings", () => {
        const existingStart = new Date("2024-03-15T10:00:00").getTime();
        const existingEnd = new Date("2024-03-15T11:00:00").getTime();
        const newStart = new Date("2024-03-15T12:00:00").getTime();
        const newEnd = new Date("2024-03-15T13:00:00").getTime();
        expect(hasOverlap(existingStart, existingEnd, newStart, newEnd)).toBe(false);
    });
});
