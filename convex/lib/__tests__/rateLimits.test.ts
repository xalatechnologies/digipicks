import { describe, it, expect, vi } from "vitest";

vi.mock("convex-helpers/server/rateLimit", () => ({
  defineRateLimits: (limits: any) => ({
    rateLimit: vi.fn(),
    checkRateLimit: vi.fn(),
    resetRateLimit: vi.fn(),
  }),
}));

import { RATE_LIMITS, rateLimitKeys } from "../rateLimits";

describe("RATE_LIMITS", () => {
  it("has exactly 51 rate limits defined", () => {
    expect(Object.keys(RATE_LIMITS)).toHaveLength(51);
  });

  it("all rate limits have kind, rate, and period fields", () => {
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      expect(config).toHaveProperty("kind");
      expect(config).toHaveProperty("rate");
      expect(config).toHaveProperty("period");
    }
  });

  it("all rates are positive numbers", () => {
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      expect(config.rate).toBeGreaterThan(0);
    }
  });

  it("all periods are positive numbers", () => {
    for (const [name, config] of Object.entries(RATE_LIMITS)) {
      expect(config.period).toBeGreaterThan(0);
    }
  });

  describe("token bucket limits", () => {
    const tokenBucketLimits = Object.entries(RATE_LIMITS).filter(
      ([, config]) => config.kind === "token bucket"
    );

    it("token bucket limits have capacity field", () => {
      for (const [name, config] of tokenBucketLimits) {
        expect(config).toHaveProperty("capacity");
        expect((config as any).capacity).toBeGreaterThan(0);
      }
    });
  });

  describe("fixed window limits", () => {
    it("loginAttempt uses fixed window", () => {
      expect(RATE_LIMITS.loginAttempt.kind).toBe("fixed window");
    });

    it("passwordReset uses fixed window", () => {
      expect(RATE_LIMITS.passwordReset.kind).toBe("fixed window");
    });

    it("magicLinkRequest uses fixed window", () => {
      expect(RATE_LIMITS.magicLinkRequest.kind).toBe("fixed window");
    });
  });

  describe("auth limits are restrictive", () => {
    it("loginAttempt allows max 5 per 5 minutes", () => {
      expect(RATE_LIMITS.loginAttempt.rate).toBe(5);
      expect(RATE_LIMITS.loginAttempt.period).toBe(300_000);
    });

    it("passwordReset allows max 3 per hour", () => {
      expect(RATE_LIMITS.passwordReset.rate).toBe(3);
      expect(RATE_LIMITS.passwordReset.period).toBe(3_600_000);
    });
  });

  describe("bulk operations are throttled", () => {
    it("bulkExport has rate of 1", () => {
      expect(RATE_LIMITS.bulkExport.rate).toBe(1);
    });

    it("bulkImport has rate of 1", () => {
      expect(RATE_LIMITS.bulkImport.rate).toBe(1);
    });
  });

  describe("API general has high capacity", () => {
    it("apiGeneral has rate 100 and capacity 200", () => {
      expect(RATE_LIMITS.apiGeneral.rate).toBe(100);
      expect((RATE_LIMITS.apiGeneral as any).capacity).toBe(200);
    });
  });

  describe("SOC2 coverage: sensitive operations have rate limits", () => {
    it("login attempts are rate limited", () => {
      expect(RATE_LIMITS).toHaveProperty("loginAttempt");
    });

    it("password reset is rate limited", () => {
      expect(RATE_LIMITS).toHaveProperty("passwordReset");
    });

    it("bulk export is rate limited", () => {
      expect(RATE_LIMITS).toHaveProperty("bulkExport");
    });

    it("bulk import is rate limited", () => {
      expect(RATE_LIMITS).toHaveProperty("bulkImport");
    });
  });
});

describe("rateLimitKeys", () => {
  it('tenant builds "tenant:{id}" format', () => {
    expect(rateLimitKeys.tenant("t123")).toBe("tenant:t123");
  });

  it('user builds "user:{id}" format', () => {
    expect(rateLimitKeys.user("u456")).toBe("user:u456");
  });

  it('tenantUser builds "tenant:{tenantId}:user:{userId}" format', () => {
    expect(rateLimitKeys.tenantUser("t123", "u456")).toBe(
      "tenant:t123:user:u456"
    );
  });

  it('ip builds "ip:{address}" format', () => {
    expect(rateLimitKeys.ip("192.168.1.1")).toBe("ip:192.168.1.1");
  });
});
