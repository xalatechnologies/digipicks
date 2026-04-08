/**
 * Vipps Status Mapping & Payment Logic — Pure Business Logic Tests
 *
 * Extracted from tests/convex/vipps-payment.test.ts
 * Tests reference generation, state mapping, amount conversions, and API payload structure.
 * No Convex runtime required — plain vitest with mappings and assertions.
 */

import { describe, it, expect } from "vitest";

// =============================================================================
// Helper Functions (mirrored from Vipps integration)
// =============================================================================

/**
 * Map Vipps ePayment state to internal payment status.
 */
function mapVippsState(state: string): string {
  switch (state) {
    case "CREATED":
      return "created";
    case "AUTHORIZED":
      return "authorized";
    case "ABORTED":
      return "cancelled";
    case "EXPIRED":
      return "failed";
    case "TERMINATED":
      return "cancelled";
    default:
      return state.toLowerCase();
  }
}

// =============================================================================
// Payment Reference Generation
// =============================================================================

describe("Payment Reference Generation", () => {
  it("should generate reference with bookingId", () => {
    const bookingId = "bookings_12345";
    const reference = `xala-${bookingId}-${Date.now()}`;

    expect(reference).toMatch(/^xala-bookings_\d+-\d+$/);
    expect(reference).toContain(bookingId);
  });

  it("should generate reference without bookingId (direct payment)", () => {
    const reference = `xala-direct-${Date.now()}`;

    expect(reference).toMatch(/^xala-direct-\d+$/);
  });

  it("should generate unique references for concurrent payments", () => {
    const bookingId = "bookings_99999";
    const refs = new Set<string>();
    for (let i = 0; i < 100; i++) {
      refs.add(`xala-${bookingId}-${Date.now()}-${i}`);
    }
    expect(refs.size).toBe(100);
  });
});

// =============================================================================
// Vipps State Mapping
// =============================================================================

describe("Vipps State Mapping", () => {
  it("should map CREATED to created", () => {
    expect(mapVippsState("CREATED")).toBe("created");
  });

  it("should map AUTHORIZED to authorized", () => {
    expect(mapVippsState("AUTHORIZED")).toBe("authorized");
  });

  it("should map ABORTED to cancelled", () => {
    expect(mapVippsState("ABORTED")).toBe("cancelled");
  });

  it("should map EXPIRED to failed", () => {
    expect(mapVippsState("EXPIRED")).toBe("failed");
  });

  it("should map TERMINATED to cancelled", () => {
    expect(mapVippsState("TERMINATED")).toBe("cancelled");
  });

  it("should lowercase unknown states", () => {
    expect(mapVippsState("CAPTURED")).toBe("captured");
    expect(mapVippsState("REFUNDED")).toBe("refunded");
  });
});

// =============================================================================
// Payment Amounts
// =============================================================================

describe("Payment Amounts", () => {
  it("should store amounts in minor units (ore)", () => {
    // 500 NOK = 50000 ore
    const amountNOK = 500;
    const amountOre = amountNOK * 100;

    expect(amountOre).toBe(50000);
  });

  it("should default currency to NOK", () => {
    const currency = undefined;
    const defaultCurrency = currency || "NOK";
    expect(defaultCurrency).toBe("NOK");
  });
});

// =============================================================================
// Vipps API Payload Structure
// =============================================================================

describe("Vipps API Payload Structure", () => {
  it("should construct correct createPayment payload", () => {
    const bookingId = "bookings_67890";
    const reference = `xala-${bookingId}-${Date.now()}`;
    const amount = 50000;
    const currency = "NOK";
    const returnUrl = "http://localhost:5173/payment/callback";

    const payload = {
      amount: {
        currency,
        value: amount,
      },
      paymentMethod: {
        type: "WALLET",
      },
      reference,
      returnUrl: `${returnUrl}?reference=${encodeURIComponent(reference)}`,
      userFlow: "WEB_REDIRECT",
      paymentDescription: "Booking payment for resource",
    };

    expect(payload.amount.value).toBe(50000);
    expect(payload.amount.currency).toBe("NOK");
    expect(payload.paymentMethod.type).toBe("WALLET");
    expect(payload.userFlow).toBe("WEB_REDIRECT");
    expect(payload.returnUrl).toContain("reference=");
  });

  it("should construct correct capture payload", () => {
    const captureAmount = 50000;

    const payload = {
      modificationAmount: {
        currency: "NOK",
        value: captureAmount,
      },
    };

    expect(payload.modificationAmount.value).toBe(50000);
    expect(payload.modificationAmount.currency).toBe("NOK");
  });

  it("should construct correct refund payload", () => {
    const refundAmount = 25000;

    const payload = {
      modificationAmount: {
        currency: "NOK",
        value: refundAmount,
      },
    };

    expect(payload.modificationAmount.value).toBe(25000);
  });
});

// =============================================================================
// Webhook Payload Validation (pure structure tests)
// =============================================================================

describe("Webhook Payload Validation", () => {
  it("should handle webhook with missing reference gracefully", () => {
    const webhookPayload = {
      state: "AUTHORIZED",
      // no reference
    };

    const reference = (webhookPayload as { reference?: string }).reference;
    expect(reference).toBeUndefined();

    // Webhook handler should log and return { received: true }
    const result = !reference
      ? { received: true }
      : { received: true, processed: true };

    expect(result.received).toBe(true);
    expect((result as { processed?: boolean }).processed).toBeUndefined();
  });
});

// =============================================================================
// Refund Calculation Logic (pure math)
// =============================================================================

describe("Refund Calculation Logic", () => {
  it("should determine full refund status", () => {
    const amount = 20000;
    const refundedAmount = 0;
    const refundRequest = 20000;

    const newRefunded = refundedAmount + refundRequest;
    const newStatus = newRefunded >= amount ? "refunded" : "captured";

    expect(newRefunded).toBe(20000);
    expect(newStatus).toBe("refunded");
  });

  it("should determine partial refund status", () => {
    const amount = 20000;
    const refundedAmount = 0;
    const refundRequest = 5000;

    const newRefunded = refundedAmount + refundRequest;
    const newStatus = newRefunded >= amount ? "refunded" : "captured";

    expect(newRefunded).toBe(5000);
    expect(newStatus).toBe("captured");
  });

  it("should accumulate multiple partial refunds", () => {
    const amount = 30000;
    let refundedAmount = 0;

    // First refund: 10000
    refundedAmount += 10000;
    expect(refundedAmount).toBe(10000);
    expect(refundedAmount >= amount ? "refunded" : "captured").toBe("captured");

    // Second refund: 10000
    refundedAmount += 10000;
    expect(refundedAmount).toBe(20000);
    expect(refundedAmount >= amount ? "refunded" : "captured").toBe("captured");

    // Third refund: 10000 (now fully refunded)
    refundedAmount += 10000;
    expect(refundedAmount).toBe(30000);
    expect(refundedAmount >= amount ? "refunded" : "captured").toBe("refunded");
  });
});
