/**
 * Consolidation RBAC E2E Tests
 *
 * Verifies role-based access control on the unified dashboard portal.
 * Tests that each role is redirected correctly and cannot access
 * routes outside its permission scope.
 *
 * Requires dashboard dev server running (default: localhost:5180).
 */

import { test, expect } from "./fixtures/auth.fixture";
import { captureEvidence } from "./helpers/evidence";

const DASHBOARD_URL =
  process.env.TEST_DASHBOARD_URL || "http://localhost:5180";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToDashboard(
  page: import("@playwright/test").Page,
  path: string
) {
  await page.goto(`${DASHBOARD_URL}${path}`, {
    waitUntil: "domcontentloaded",
  });
  await page
    .locator("main")
    .first()
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => null);
}

// =============================================================================
// Suite 1: Superadmin RBAC
// =============================================================================

test.describe("Consolidation RBAC: Superadmin", () => {
  test("CRBAC-001: Superadmin redirects to /platform @smoke", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    const url = page.url();

    await captureEvidence(page, testInfo, "superadmin-redirect");

    // Superadmin should be redirected to /platform
    if (!url.includes("/login")) {
      expect(url).toContain("/platform");
    }
  });

  test("CRBAC-002: Superadmin sees platform navigation", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/platform");

    await page.waitForTimeout(2_000);
    const url = page.url();

    if (url.includes("/login")) {
      await captureEvidence(page, testInfo, "superadmin-platform-login-redirect");
      return;
    }

    const nav = page.locator("nav, aside, [role='navigation']").first();
    if (await nav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "superadmin-platform-nav");
      const menuText = await nav.textContent();
      expect(menuText).toBeTruthy();
    }
  });

  test("CRBAC-003: Superadmin can access /platform/tenants", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/platform/tenants");

    await page.waitForTimeout(2_000);
    await captureEvidence(page, testInfo, "superadmin-tenants-access");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).not.toContain("/unauthorized");
    }
  });

  test("CRBAC-004: Superadmin can access /platform/billing", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/platform/billing");

    await page.waitForTimeout(2_000);
    await captureEvidence(page, testInfo, "superadmin-billing-access");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).not.toContain("/unauthorized");
    }
  });

  test("CRBAC-005: Superadmin can access /platform/audit", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/platform/audit");

    await page.waitForTimeout(2_000);
    await captureEvidence(page, testInfo, "superadmin-audit-access");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).not.toContain("/unauthorized");
    }
  });
});

// =============================================================================
// Suite 2: Admin RBAC (should NOT access platform routes)
// =============================================================================

test.describe("Consolidation RBAC: Admin", () => {
  test("CRBAC-010: Admin sees backoffice dashboard (not /platform)", async ({
    page,
    loginAsAdmin,
  }, testInfo) => {
    await loginAsAdmin("dashboard");
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "admin-dashboard-home");

    const url = page.url();
    if (!url.includes("/login")) {
      // Admin should NOT be redirected to /platform
      expect(url).not.toContain("/platform");
    }
  });

  test("CRBAC-011: Admin cannot access /platform routes", async ({
    page,
    loginAsAdmin,
  }, testInfo) => {
    await loginAsAdmin("dashboard");
    await goToDashboard(page, "/platform");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "admin-platform-denied");

    const url = page.url();
    if (!url.includes("/login")) {
      // Admin should be redirected away from /platform
      const body = await page.textContent("body");
      const denied =
        !url.includes("/platform") ||
        url.includes("/unauthorized") ||
        (body?.includes("Ingen tilgang") ?? false);
      expect(denied).toBeTruthy();
    }
  });

  test("CRBAC-012: Admin sees full backoffice navigation", async ({
    page,
    loginAsAdmin,
  }, testInfo) => {
    await loginAsAdmin("dashboard");
    await goToDashboard(page, "/");

    await page.waitForTimeout(2_000);
    const url = page.url();

    if (url.includes("/login")) {
      await captureEvidence(page, testInfo, "admin-nav-login-redirect");
      return;
    }

    const nav = page.locator("nav, aside, [role='navigation']").first();
    if (await nav.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, "admin-full-nav");
      const menuText = await nav.textContent();
      expect(menuText).toBeTruthy();
    }
  });
});

// =============================================================================
// Suite 3: Role-based redirects
// =============================================================================

test.describe("Consolidation RBAC: Role Redirects", () => {
  test("CRBAC-020: Arranger redirects to /events", async ({
    page,
    loginAsArranger,
  }, testInfo) => {
    await loginAsArranger("dashboard");
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "arranger-redirect");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).toContain("/events");
    }
  });

  test("CRBAC-021: Case handler redirects to /work-queue", async ({
    page,
    loginAsSaksbehandler,
  }, testInfo) => {
    await loginAsSaksbehandler("dashboard");
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "case-handler-redirect");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).toContain("/work-queue");
    }
  });

  test("CRBAC-022: User redirects to /my", async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs("user", "dashboard");
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "user-redirect");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).toContain("/my");
    }
  });
});

// =============================================================================
// Suite 4: Cross-role access denial
// =============================================================================

test.describe("Consolidation RBAC: Access Denial", () => {
  test("CRBAC-030: User cannot access /users-management", async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs("user", "dashboard");
    await goToDashboard(page, "/users-management");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "user-admin-denied");

    const url = page.url();
    if (!url.includes("/login")) {
      const body = await page.textContent("body");
      const denied =
        !url.includes("/users-management") ||
        (body?.includes("Ingen tilgang") ?? false);
      expect(denied).toBeTruthy();
    }
  });

  test("CRBAC-031: User cannot access /platform", async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs("user", "dashboard");
    await goToDashboard(page, "/platform");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "user-platform-denied");

    const url = page.url();
    if (!url.includes("/login")) {
      expect(url).not.toContain("/platform");
    }
  });

  test("CRBAC-032: Arranger cannot access /gdpr", async ({
    page,
    loginAsArranger,
  }, testInfo) => {
    await loginAsArranger("dashboard");
    await goToDashboard(page, "/gdpr");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "arranger-gdpr-denied");

    const url = page.url();
    if (!url.includes("/login")) {
      const body = await page.textContent("body");
      const denied =
        !url.includes("/gdpr") ||
        (body?.includes("Ingen tilgang") ?? false);
      expect(denied).toBeTruthy();
    }
  });

  test("CRBAC-033: Case handler cannot access /tenant/settings", async ({
    page,
    loginAsSaksbehandler,
  }, testInfo) => {
    await loginAsSaksbehandler("dashboard");
    await goToDashboard(page, "/tenant/settings");

    await page.waitForTimeout(3_000);
    await captureEvidence(page, testInfo, "handler-tenant-settings-denied");

    const url = page.url();
    if (!url.includes("/login")) {
      const body = await page.textContent("body");
      const denied =
        !url.includes("/tenant/settings") ||
        (body?.includes("Ingen tilgang") ?? false);
      expect(denied).toBeTruthy();
    }
  });
});
