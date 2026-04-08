/**
 * Seed Fixture — ensures E2E test data exists before suites run.
 *
 * Provides test-level access to known IDs and configuration
 * from the E2E seed data set.
 */

import { test as base } from "@playwright/test";

/** E2E demo tenant — stable ID from seeds. */
export const E2E_TENANT_ID = "qd71nzdbvssrm2n3n2018daspx81pftx";

/** Known E2E performance slugs (matched by name prefix in seed). */
export const E2E_PERFORMANCES = {
  FUTURE_1: "PERF-FUTURE-1",
  FUTURE_2: "PERF-FUTURE-2",
  PRESALE: "PERF-PRESALE",
  PUBLISH: "PERF-PUBLISH",
  SOLDOUT: "PERF-SOLDOUT",
  PAST: "PERF-PAST",
} as const;

/** Known E2E discount code. */
export const E2E_DISCOUNT_CODE = "E2ETEST10";

/** Known E2E gift card codes. */
export const E2E_GIFT_CARDS = ["E2E-GC-001", "E2E-GC-002", "E2E-GC-003"];

/** App base URLs. */
export const APP_URLS = {
  web: process.env.TEST_BASE_URL || "http://localhost:5190",
  backoffice: process.env.TEST_BACKOFFICE_URL || "http://localhost:5175",
  minside: process.env.TEST_MINSIDE_URL || "http://localhost:5174",
} as const;

export const test = base.extend<{
  tenantId: string;
  webUrl: string;
  backofficeUrl: string;
  minsideUrl: string;
}>({
  tenantId: async ({}, use) => {
    await use(E2E_TENANT_ID);
  },
  webUrl: async ({}, use) => {
    await use(APP_URLS.web);
  },
  backofficeUrl: async ({}, use) => {
    await use(APP_URLS.backoffice);
  },
  minsideUrl: async ({}, use) => {
    await use(APP_URLS.minside);
  },
});

export { expect } from "@playwright/test";
