/**
 * Dashboard User Journey E2E Tests
 *
 * Tests role-based user journeys on the unified dashboard portal.
 * Each journey follows a specific persona through their primary workflow.
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

function isLoginPage(url: string): boolean {
  return url.includes("/login");
}

// =============================================================================
// Journey 1: Superadmin — Platform Management
// =============================================================================

test.describe("Journey 1: Superadmin Platform Management", () => {
  test.beforeEach(async ({ loginAsSuperadmin }) => {
    await loginAsSuperadmin("dashboard");
  });

  test("J1.1: Superadmin lands on platform overview", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/platform");

    const url = page.url();
    if (isLoginPage(url)) {
      await captureEvidence(page, testInfo, "superadmin-platform-login");
      test.skip(true, "Auth bypass not available");
      return;
    }

    await captureEvidence(page, testInfo, "superadmin-platform-overview");
    expect(url).toContain("/platform");
  });

  test("J1.2: Navigate to tenant management", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/platform/tenants");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "superadmin-tenants-page");
    expect(url).toContain("/platform/tenants");
  });

  test("J1.3: Navigate to platform billing", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/platform/billing");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "superadmin-billing-page");
    expect(url).toContain("/platform/billing");
  });

  test("J1.4: Navigate to platform audit log", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/platform/audit");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "superadmin-audit-page");
    expect(url).toContain("/platform/audit");
  });

  test("J1.5: Navigate to content moderation", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/platform/moderation");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "superadmin-moderation-page");
    expect(url).toContain("/platform/moderation");
  });
});

// =============================================================================
// Journey 2: Admin — Tenant Administration
// =============================================================================

test.describe("Journey 2: Admin Tenant Administration", () => {
  test.beforeEach(async ({ loginAsAdmin }) => {
    await loginAsAdmin("dashboard");
  });

  test("J2.1: Admin lands on dashboard", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-dashboard-home");
    // Admin should not be redirected to /platform
    expect(url).not.toContain("/platform");
  });

  test("J2.2: Admin navigates to events", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/events");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-events-page");
    expect(url).toContain("/events");
  });

  test("J2.3: Admin accesses tenant settings", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/tenant/settings");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-tenant-settings");
    expect(url).toContain("/tenant/settings");
  });

  test("J2.4: Admin accesses user management", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/users-management");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-users-management");
    expect(url).toContain("/users-management");
  });

  test("J2.5: Admin accesses GDPR page", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/gdpr");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-gdpr-page");
    expect(url).toContain("/gdpr");
  });

  test("J2.6: Admin accesses payment reconciliation", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/payments/reconciliation");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-payment-reconciliation");
    expect(url).toContain("/payments/reconciliation");
  });
});

// =============================================================================
// Journey 3: Arranger — Event Management
// =============================================================================

test.describe("Journey 3: Arranger Event Management", () => {
  test.beforeEach(async ({ loginAsArranger }) => {
    await loginAsArranger("dashboard");
  });

  test("J3.1: Arranger lands on /events", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "arranger-home-redirect");
    expect(url).toContain("/events");
  });

  test("J3.2: Arranger can access performance creation", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/performances/new");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "arranger-performance-new");
    // Arranger should not be blocked
    expect(url).not.toContain("/unauthorized");
  });
});

// =============================================================================
// Journey 4: Case Handler — Work Queue
// =============================================================================

test.describe("Journey 4: Case Handler Work Queue", () => {
  test.beforeEach(async ({ loginAsSaksbehandler }) => {
    await loginAsSaksbehandler("dashboard");
  });

  test("J4.1: Case handler lands on /work-queue", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "handler-home-redirect");
    expect(url).toContain("/work-queue");
  });

  test("J4.2: Case handler can access bookings", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/bookings");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "handler-bookings-access");
    expect(url).not.toContain("/unauthorized");
  });
});

// =============================================================================
// Journey 5: User — Personal Dashboard
// =============================================================================

test.describe("Journey 5: User Personal Dashboard", () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs("user", "dashboard");
  });

  test("J5.1: User lands on /my", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/");

    await page.waitForTimeout(3_000);
    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "user-home-redirect");
    expect(url).toContain("/my");
  });

  test("J5.2: User can access personal bookings", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/my/bookings");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "user-bookings-access");
    expect(url).toContain("/my/bookings");
  });

  test("J5.3: User can access personal tickets", async ({
    page,
  }, testInfo) => {
    await goToDashboard(page, "/my/tickets");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "user-tickets-access");
    expect(url).toContain("/my/tickets");
  });
});

// =============================================================================
// Journey 6: Role Hierarchy — Admin accesses user routes
// =============================================================================

test.describe("Journey 6: Role Hierarchy", () => {
  test("J6.1: Admin can access /my (user-level route)", async ({
    page,
    loginAsAdmin,
  }, testInfo) => {
    await loginAsAdmin("dashboard");
    await goToDashboard(page, "/my");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "admin-user-route-access");
    // Admin should be able to access user routes (role hierarchy)
    expect(url).not.toContain("/unauthorized");
  });

  test("J6.2: Superadmin can access admin routes", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/events");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "superadmin-admin-route-access");
    expect(url).not.toContain("/unauthorized");
  });

  test("J6.3: Owner has same access as admin", async ({
    page,
    loginAsOwner,
  }, testInfo) => {
    await loginAsOwner("dashboard");
    await goToDashboard(page, "/tenant/settings");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "owner-admin-route-access");
    expect(url).toContain("/tenant/settings");
  });
});

// =============================================================================
// Journey 7: Mobile Responsiveness
// =============================================================================

test.describe("Journey 7: Mobile Dashboard", () => {
  test.use({ viewport: { width: 375, height: 667 }, hasTouch: true });

  test("J7.1: Platform overview loads on mobile", async ({
    page,
    loginAsSuperadmin,
  }, testInfo) => {
    await loginAsSuperadmin("dashboard");
    await goToDashboard(page, "/platform");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "mobile-platform-overview");
    expect(url).toContain("/platform");
  });

  test("J7.2: Admin dashboard loads on mobile", async ({
    page,
    loginAsAdmin,
  }, testInfo) => {
    await loginAsAdmin("dashboard");
    await goToDashboard(page, "/");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "mobile-admin-dashboard");
    // Just verify it loads without errors
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });

  test("J7.3: User personal page loads on mobile", async ({
    page,
    loginAs,
  }, testInfo) => {
    await loginAs("user", "dashboard");
    await goToDashboard(page, "/my");

    const url = page.url();
    if (isLoginPage(url)) { test.skip(true, "Auth bypass not available"); return; }

    await captureEvidence(page, testInfo, "mobile-user-dashboard");
    const body = await page.textContent("body");
    expect(body).toBeTruthy();
  });
});
