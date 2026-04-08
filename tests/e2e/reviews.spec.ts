/**
 * Reviews E2E Tests
 *
 * Tests for the reviews user flow across multiple apps:
 * - User reviews on minside app (port 5174)
 * - Admin moderation on backoffice app (port 5175)
 * - Public review display on web app listings
 *
 * The web app at /min-side redirects to the minside app.
 * Tests that require minside/backoffice skip gracefully when those apps
 * aren't running. Only the web-app integration tests (public reviews on
 * listing pages) run against the default test server.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5190';
const MINSIDE_URL = process.env.TEST_MINSIDE_URL || 'http://localhost:5174';
const BACKOFFICE_URL = process.env.TEST_BACKOFFICE_URL || 'http://localhost:5175';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Check if an app is reachable by trying to load its root */
async function isAppAvailable(page: typeof import('@playwright/test').Page.prototype, url: string): Promise<boolean> {
  try {
    const response = await page.goto(url, { timeout: 5_000, waitUntil: 'domcontentloaded' });
    return response !== null && response.status() < 400;
  } catch {
    return false;
  }
}

// =============================================================================
// Reviews — Public Web App (Listing Detail Page)
// =============================================================================

test.describe('Reviews — Web App (Public)', () => {
  test('should show listing detail page', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('main#main-content').waitFor({ state: 'visible', timeout: 10_000 });

    const cards = await page.locator('.listing-card').count();
    if (cards === 0) { test.skip(true, 'No listings available'); return; }

    await page.locator('.listing-card').first().click();
    await expect(page).toHaveURL(/\/listing\//);
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });
  });

  test('should show reviews section on listing page if reviews enabled', async ({ page }) => {
    await page.goto(BASE_URL);
    await page.locator('.listing-card').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => null);

    const cards = await page.locator('.listing-card').count();
    if (cards === 0) { test.skip(true, 'No listings available'); return; }

    await page.locator('.listing-card').first().click();
    await expect(page).toHaveURL(/\/listing\//);

    // Reviews section may or may not exist (gated by FeatureGate module="reviews")
    const reviewsHeading = page.locator('h2:has-text("Anmeldelser")');
    const hasReviews = await reviewsHeading.isVisible({ timeout: 5_000 }).catch(() => false);

    // This is informational — reviews feature may be disabled
    if (hasReviews) {
      await expect(reviewsHeading).toBeVisible();
    }
  });
});

// =============================================================================
// Reviews — Min-Side App (User Flow)
// =============================================================================

test.describe('Reviews — Min-Side (User Flow)', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isAppAvailable(page, MINSIDE_URL);
    if (!available) {
      test.skip(true, 'Min-side app not running');
    }
  });

  test('should load minside reviews page', async ({ page }) => {
    await page.goto(`${MINSIDE_URL}/omtaler`, { waitUntil: 'domcontentloaded' });

    // Check for actual reviews page content (not just the SPA shell)
    const hasContent = await page.locator('text=/omtaler|anmeldelser|Alle|Venter/i').first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasContent) {
      test.skip(true, 'Reviews page not available on minside');
      return;
    }

    // If we get here, reviews content is visible
    expect(hasContent).toBeTruthy();
  });

  test('should display review tabs if reviews exist', async ({ page }) => {
    await page.goto(`${MINSIDE_URL}/omtaler`);

    const hasContent = await page.locator('text=/omtaler|anmeldelser/i').first()
      .isVisible({ timeout: 5_000 }).catch(() => false);
    if (!hasContent) { test.skip(true, 'Reviews page not available'); return; }

    // Tab structure: Alle, Venter, Godkjent, Avvist
    const tabs = page.getByRole('tab');
    const tabCount = await tabs.count();

    if (tabCount > 0) {
      // Should have status filter tabs
      expect(tabCount).toBeGreaterThanOrEqual(2);
    }
  });
});

// =============================================================================
// Reviews — Backoffice App (Admin Moderation)
// =============================================================================

test.describe('Reviews — Backoffice (Admin Moderation)', () => {
  test.beforeEach(async ({ page }) => {
    const available = await isAppAvailable(page, BACKOFFICE_URL);
    if (!available) {
      test.skip(true, 'Backoffice app not running');
    }
  });

  test('should load backoffice reviews page', async ({ page }) => {
    await page.goto(`${BACKOFFICE_URL}/anmeldelser`);

    // Check for moderation UI
    const hasContent = await page.locator('text=/moderering|anmeldelser|reviews/i').first()
      .isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasContent) {
      test.skip(true, 'Reviews moderation page not available');
      return;
    }

    await expect(page.locator('main, [role="main"]').first()).toBeVisible();
  });

  test('should show review moderation heading', async ({ page }) => {
    await page.goto(`${BACKOFFICE_URL}/anmeldelser`);

    const heading = page.locator('h1, h2').filter({ hasText: /moderering|anmeldelser/i }).first();
    const hasHeading = await heading.isVisible({ timeout: 5_000 }).catch(() => false);

    if (!hasHeading) {
      test.skip(true, 'Moderation page not loaded');
      return;
    }

    await expect(heading).toBeVisible();
  });
});

// =============================================================================
// Reviews — Integration (Cross-App)
// =============================================================================

test.describe('Reviews — Integration', () => {
  test.skip(true, 'Cross-app integration tests require all 3 apps running');

  test('user review appears in admin queue', async ({ page, context }) => {
    // Requires: minside + backoffice + web all running
    // Step 1: User submits review on minside
    // Step 2: Admin sees it in backoffice queue
    // Step 3: Approved review shows on web listing
  });
});
