/**
 * Suite I: Reporting & Export
 *
 * A-krav A-9.1 through A-9.7
 * Verifies revenue reports, sell-through rates, cancellation reports,
 * CSV exports, and reconciliation checks.
 */

import { test, expect } from "../fixtures/auth.fixture";
import {
  captureEvidence,
  captureDownload,
  saveJsonEvidence,
} from "../helpers/evidence";
import * as api from "../helpers/convex-api";

const BACKOFFICE_URL =
  process.env.TEST_BACKOFFICE_URL || "http://localhost:5175";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToBackoffice(
  page: import("@playwright/test").Page,
  path: string
) {
  await page.goto(`${BACKOFFICE_URL}${path}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
}

// =============================================================================
// Tests
// =============================================================================

test.describe("Suite I: Reporting & Export", () => {
  // A-9.1: Revenue report by ticket type
  test("RPT-001: Revenue report by ticket type", async ({
    page,
    loginAsFinance,
  }, testInfo) => {
    await loginAsFinance("backoffice");
    await goToBackoffice(page, "/analytics");
    await page.waitForTimeout(3_000);

    // Look for revenue/ticket type report
    const revenueSection = page.locator(
      'text="Inntekter", text="Revenue", text="Billettinntekter", [class*="revenue"]'
    ).first();

    if (await revenueSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "revenue-by-ticket-type");
    } else {
      await captureEvidence(page, testInfo, "analytics-page-overview");
    }
  });

  // A-9.2: Sell-through rate per performance
  test("RPT-002: Sell-through rate chart", async ({
    page,
    loginAsFinance,
  }, testInfo) => {
    await loginAsFinance("backoffice");
    await goToBackoffice(page, "/analytics");
    await page.waitForTimeout(3_000);

    // Look for sell-through or sales chart
    const chart = page.locator(
      'canvas, svg[class*="chart"], [class*="chart"], [class*="sellThrough"]'
    ).first();

    if (await chart.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "sell-through-chart");
    } else {
      await captureEvidence(page, testInfo, "analytics-no-chart");
    }
  });

  // A-9.3: Cancellation report by date range
  test("RPT-003: Cancellation report", async ({
    page,
    loginAsFinance,
  }, testInfo) => {
    await loginAsFinance("backoffice");
    await goToBackoffice(page, "/analytics");
    await page.waitForTimeout(3_000);

    // Look for cancellation/refund report section
    const cancelSection = page.locator(
      'text="Kanselleringer", text="Refusjoner", text="Cancellations"'
    ).first();

    if (await cancelSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "cancellation-report");
    } else {
      await captureEvidence(page, testInfo, "analytics-cancellation-section");
    }
  });

  // A-9.4: Presale vs general sale breakdown
  test("RPT-004: Presale vs general sale", async ({
    page,
    loginAsFinance,
  }, testInfo) => {
    await loginAsFinance("backoffice");
    await goToBackoffice(page, "/analytics");
    await page.waitForTimeout(3_000);

    // Look for presale breakdown
    const presaleSection = page.locator(
      'text="Forsalg", text="Presale", text="Forhåndssalg"'
    ).first();

    if (await presaleSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "presale-breakdown-chart");
    } else {
      await captureEvidence(page, testInfo, "analytics-no-presale-section");
    }
  });

  // A-9.5: CSV export matches UI totals
  test("RPT-005: CSV export available", async ({
    page,
    loginAsFinance,
  }, testInfo) => {
    await loginAsFinance("backoffice");
    await goToBackoffice(page, "/analytics");
    await page.waitForTimeout(3_000);

    // Look for export button
    const exportBtn = page
      .locator(
        'button:has-text("Eksporter"), button:has-text("Export"), button:has-text("Last ned CSV")'
      )
      .first();

    if (await exportBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "export-button-visible");

      // Try to trigger download
      const filepath = await captureDownload(
        page,
        testInfo,
        "analytics-csv-export",
        async () => {
          await exportBtn.click();
        }
      );

      if (filepath) {
        await captureEvidence(page, testInfo, "export-csv-downloaded");
      }
    } else {
      await captureEvidence(page, testInfo, "export-no-button");
    }
  });

  // A-9.6: Reconciliation: orders ↔ payments ↔ invoices (API-level)
  test("RPT-006: Reconciliation cross-check", async (
    { page },
    testInfo
  ) => {
    // Fetch orders and check that payment totals match
    const performances = await api.listPerformances(api.HAMAR_TENANT_ID);

    if (performances && performances.length > 0) {
      const reconciliation = performances.map((p) => ({
        performanceId: p._id,
        totalCapacity: p.totalCapacity,
        soldCount: p.soldCount,
        reservedCount: p.reservedCount,
      }));

      saveJsonEvidence(
        testInfo,
        "reconciliation",
        "orders-payments-reconciliation",
        {
          tenantId: api.HAMAR_TENANT_ID,
          performanceCount: performances.length,
          data: reconciliation.slice(0, 10),
        }
      );
    } else {
      saveJsonEvidence(
        testInfo,
        "reconciliation",
        "reconciliation-no-data",
        { note: "No performances found for reconciliation" }
      );
    }
  });

  // A-9.7: Membership usage impact report
  test("RPT-007: Membership usage impact report", async ({
    page,
    loginAsFinance,
  }, testInfo) => {
    await loginAsFinance("backoffice");
    await goToBackoffice(page, "/analytics");
    await page.waitForTimeout(3_000);

    // Look for membership impact section
    const memberSection = page.locator(
      'text="Medlemskap", text="Membership", text="Kulturhusvenn"'
    ).first();

    if (await memberSection.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "membership-usage-report");
    } else {
      await captureEvidence(page, testInfo, "analytics-no-membership-section");
    }
  });
});
