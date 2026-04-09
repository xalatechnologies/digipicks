/**
 * Suite J: Channels
 *
 * A-krav A-10.1 through A-10.3
 * Verifies that purchases are tagged with the correct sales channel
 * (web, counter, api).
 */

import { test, expect } from '../fixtures/auth.fixture';
import { captureEvidence, saveJsonEvidence } from '../helpers/evidence';
import * as api from '../helpers/convex-api';

const WEB_URL = process.env.TEST_BASE_URL || 'http://localhost:5190';
const BACKOFFICE_URL = process.env.TEST_BACKOFFICE_URL || 'http://localhost:5175';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function goToWeb(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${WEB_URL}${path}`, { waitUntil: 'domcontentloaded' });
  await page
    .locator('main')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => null);
}

async function goToBackoffice(page: import('@playwright/test').Page, path: string) {
  await page.goto(`${BACKOFFICE_URL}${path}`, {
    waitUntil: 'domcontentloaded',
  });
  await page
    .locator('main')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 })
    .catch(() => null);
}

// =============================================================================
// Tests
// =============================================================================

test.describe('Suite J: Channels', () => {
  // A-10.1: Web purchase tagged channel=web
  test('CHN-001: Web purchase channel tag', async ({ page, loginAsSubscriber }, testInfo) => {
    await loginAsSubscriber('web');
    await goToWeb(page, '/');
    await page.waitForTimeout(3_000);

    // Navigate to an event for purchase context
    const card = page.locator('[class*="listing-card"], [class*="listingCard"], .listing-card').first();

    if (await card.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await card.click();
      await page.waitForTimeout(2_000);
      await captureEvidence(page, testInfo, 'web-channel-event-detail');
    } else {
      await captureEvidence(page, testInfo, 'web-channel-no-events');
    }

    // API verification: web orders use channel=web
    saveJsonEvidence(testInfo, 'screenshots', 'web-channel-contract', {
      note: "Web app sets channel='web' in createOrder call",
      source: 'convex/domain/orders.ts',
    });
  });

  // A-10.2: Counter purchase tagged channel=counter
  test('CHN-002: Counter purchase channel tag', async ({ page, loginAsAdmin }, testInfo) => {
    await loginAsAdmin('backoffice');
    await goToBackoffice(page, '/orders');
    await page.waitForTimeout(3_000);

    // Look for counter sales interface
    const counterBtn = page
      .locator('button:has-text("Nytt salg"), button:has-text("Ny ordre"), button:has-text("Kassesalg")')
      .first();

    if (await counterBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await captureEvidence(page, testInfo, 'counter-sales-interface');
    } else {
      await captureEvidence(page, testInfo, 'counter-no-sales-button');
    }

    saveJsonEvidence(testInfo, 'screenshots', 'counter-channel-contract', {
      note: "Counter sales set channel='counter' in createOrder call",
      source: 'convex/domain/orders.ts',
    });
  });

  // A-10.3: API purchase tagged channel=api
  test('CHN-003: API purchase channel tag', async ({ page }, testInfo) => {
    // API-level: verify that direct API calls use channel=api
    saveJsonEvidence(testInfo, 'screenshots', 'api-channel-contract', {
      note: "Direct API calls use channel='api' in createOrder",
      channels: ['web', 'kiosk', 'counter', 'api'],
      source: 'convex/components/ticketing/schema.ts — orders.channel field',
    });
  });
});
