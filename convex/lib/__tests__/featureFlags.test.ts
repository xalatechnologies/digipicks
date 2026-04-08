/**
 * Feature Flag Sanitization — Pure Business Logic Tests
 *
 * Tests sanitizeFeatureFlags, ALLOWED_MODULE_IDS, and LEGACY_FLAG_KEYS.
 * No Convex runtime required — imports real validators, plain vitest.
 */

import { describe, it, expect } from "vitest";
import {
  sanitizeFeatureFlags,
  ALLOWED_MODULE_IDS,
  LEGACY_FLAG_KEYS,
} from "../featureFlagValidators";

// =============================================================================
// sanitizeFeatureFlags
// =============================================================================

describe("sanitizeFeatureFlags", () => {
  it("returns empty object for null/undefined", () => {
    expect(sanitizeFeatureFlags(null)).toEqual({});
    expect(sanitizeFeatureFlags(undefined)).toEqual({});
  });

  it("returns empty object for non-object input", () => {
    expect(sanitizeFeatureFlags("foo")).toEqual({});
    expect(sanitizeFeatureFlags(123)).toEqual({});
    expect(sanitizeFeatureFlags(true)).toEqual({});
  });

  it("accepts valid module IDs with boolean values", () => {
    const input = {
      messaging: false,
      analytics: false,
      integrations: true,
      gdpr: false,
      support: true,
    };
    expect(sanitizeFeatureFlags(input)).toEqual(input);
  });

  it("accepts legacy keys (approval_workflow)", () => {
    const input = {
      approval_workflow: false,
    };
    expect(sanitizeFeatureFlags(input)).toEqual(input);
  });

  it("filters out unknown keys", () => {
    const input = {
      messaging: true,
      unknownModule: true,
      support: false,
      foo: true,
    };
    expect(sanitizeFeatureFlags(input)).toEqual({
      messaging: true,
      support: false,
    });
  });

  it("filters out non-boolean values", () => {
    const input = {
      messaging: "yes",
      analytics: 1,
      integrations: {},
      support: null,
      gdpr: true,
    };
    expect(sanitizeFeatureFlags(input)).toEqual({ gdpr: true });
  });

  it("combines allowed and legacy correctly", () => {
    const input = {
      approval_workflow: false,
      messaging: true,
      invalid: "no",
    };
    expect(sanitizeFeatureFlags(input)).toEqual({
      approval_workflow: false,
      messaging: true,
    });
  });
});

// =============================================================================
// ALLOWED_MODULE_IDS and LEGACY_FLAG_KEYS
// =============================================================================

describe("ALLOWED_MODULE_IDS and LEGACY_FLAG_KEYS", () => {
  it("ALLOWED_MODULE_IDS contains expected modules", () => {
    expect(ALLOWED_MODULE_IDS).toContain("messaging");
    expect(ALLOWED_MODULE_IDS).toContain("analytics");
    expect(ALLOWED_MODULE_IDS).toContain("integrations");
    expect(ALLOWED_MODULE_IDS).toContain("gdpr");
    expect(ALLOWED_MODULE_IDS).toContain("reviews");
    expect(ALLOWED_MODULE_IDS).toContain("mfa");
    expect(ALLOWED_MODULE_IDS).toContain("sso");
    expect(ALLOWED_MODULE_IDS).toContain("support");
    expect(ALLOWED_MODULE_IDS).toContain("subscriptions");
    expect(ALLOWED_MODULE_IDS).toContain("pricing");
    expect(ALLOWED_MODULE_IDS).toContain("addons");
    expect(ALLOWED_MODULE_IDS).toContain("classification");
    expect(ALLOWED_MODULE_IDS.size).toBe(12);
  });

  it("LEGACY_FLAG_KEYS contains approval_workflow", () => {
    expect(LEGACY_FLAG_KEYS).toContain("approval_workflow");
  });
});
