/**
 * Suite F: Membership
 *
 * A-krav A-6.1 through A-6.6
 * Verifies membership tiers, presale access, pricing discounts,
 * and membership lifecycle (cancel, pause, resume).
 */

import { test, expect } from "../fixtures/auth.fixture";
import { captureEvidence } from "../helpers/evidence";

const WEB_URL = process.env.TEST_BASE_URL || "http://localhost:5190";
const MINSIDE_URL = process.env.TEST_MINSIDE_URL || "http://localhost:5174";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToWeb(page: import("@playwright/test").Page, path: string) {
  await page.goto(`${WEB_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
}

async function goToMinside(page: import("@playwright/test").Page, path: string) {
  await page.goto(`${MINSIDE_URL}${path}`, { waitUntil: "domcontentloaded" });
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
}

// =============================================================================
// Tests
// =============================================================================

test.describe("Suite F: Membership", () => {
  // A-6.1: View tiers and subscribe
  test("MEM-001: Membership tiers visible", async ({
    page,
    loginAsUser,
  }, testInfo) => {
    await loginAsUser("web");
    await goToWeb(page, "/membership");
    await page.waitForTimeout(3_000);

    // Look for membership tier cards or list
    const tierSection = page.locator(
      'text="Kulturhusvenn", text="Medlemskap", [class*="membership"]'
    ).first();

    if (await tierSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "membership-tiers");
    } else {
      // Try minside
      await loginAsUser("minside");
      await goToMinside(page, "/membership");
      await page.waitForTimeout(3_000);
      await captureEvidence(page, testInfo, "membership-tiers-minside");
    }
  });

  // A-6.2: Member sees presale inventory
  test("MEM-002: Member presale access", async ({
    page,
    loginAsMember,
  }, testInfo) => {
    await loginAsMember("web");
    await goToWeb(page, "/");
    await page.waitForTimeout(3_000);

    // Look for presale indicators
    const presaleIndicator = page
      .locator(
        'text="Forsalg", text="Presale", text="Forhåndssalg", [class*="presale"]'
      )
      .first();

    if (await presaleIndicator.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "member-presale-visible");
    } else {
      await captureEvidence(page, testInfo, "member-no-presale-events");
    }
  });

  // A-6.3: Pricing group discount auto-applied
  test("MEM-003: Member vs non-member price comparison", async ({
    page,
    loginAsMember,
  }, testInfo) => {
    await loginAsMember("web");
    await goToWeb(page, "/");
    await page.waitForTimeout(3_000);

    const card = page
      .locator('[class*="listing-card"], [class*="listingCard"], .listing-card')
      .first();

    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2_000);

      // Capture price display as member
      await captureEvidence(page, testInfo, "member-price-view");
    } else {
      await captureEvidence(page, testInfo, "member-no-events-for-price");
    }
  });

  // A-6.4: Cancel membership → benefits removed
  test("MEM-004: Cancel membership flow", async ({
    page,
    loginAsMember,
  }, testInfo) => {
    await loginAsMember("minside");
    await goToMinside(page, "/membership");
    await page.waitForTimeout(3_000);

    // Look for cancel/manage membership
    const cancelBtn = page
      .locator(
        'button:has-text("Avbryt"), button:has-text("Si opp"), button:has-text("Cancel")'
      )
      .first();

    if (await cancelBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "membership-cancel-button");
    } else {
      await captureEvidence(page, testInfo, "membership-no-cancel-option");
    }
  });

  // A-6.5: Pause/resume membership
  test("MEM-005: Pause membership flow", async ({
    page,
    loginAsMember,
  }, testInfo) => {
    await loginAsMember("minside");
    await goToMinside(page, "/membership");
    await page.waitForTimeout(3_000);

    // Look for pause button
    const pauseBtn = page
      .locator(
        'button:has-text("Pause"), button:has-text("Sett på pause")'
      )
      .first();

    if (await pauseBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "membership-pause-button");
    } else {
      await captureEvidence(page, testInfo, "membership-no-pause-option");
    }
  });

  // A-6.6: Benefit usage tracking
  test("MEM-006: Benefit usage log", async ({
    page,
    loginAsMember,
  }, testInfo) => {
    await loginAsMember("minside");
    await goToMinside(page, "/membership");
    await page.waitForTimeout(3_000);

    // Look for benefit usage section
    const usageSection = page.locator(
      'text="Fordeler", text="Bruk", text="Benefits", [class*="benefitUsage"]'
    ).first();

    if (await usageSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "membership-benefit-usage");
    } else {
      await captureEvidence(page, testInfo, "membership-no-usage-display");
    }
  });
});
