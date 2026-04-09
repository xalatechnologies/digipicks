/**
 * Auth Fixture — role-based login for DigiPicks e2e tests.
 *
 * Extends the base Playwright test with loginAs() helpers that set
 * auth state via localStorage bypass for deterministic role testing.
 *
 * DigiPicks role model (4 roles):
 *   - superadmin: platform-wide, no tenant
 *   - admin:      tenant-scoped
 *   - creator:    tenant-scoped
 *   - subscriber: no tenant
 */

import { test as base, type Page } from '@playwright/test';

const WEB_URL = process.env.TEST_BASE_URL || 'http://localhost:5190';
const BACKOFFICE_URL = process.env.TEST_BACKOFFICE_URL || 'http://localhost:5175';
const MINSIDE_URL = process.env.TEST_MINSIDE_URL || 'http://localhost:5174';
const DASHBOARD_URL = process.env.TEST_DASHBOARD_URL || 'http://localhost:5180';

/** E2E test users matching seedTestUsers.ts / seed-e2e.ts */
export const E2E_USERS = {
  superadmin: {
    id: 'e2e-superadmin-user-id',
    email: 'superadmin@digipicks.test',
    name: 'E2E Superadmin',
    role: 'superadmin',
  },
  admin: {
    id: 'e2e-admin-user-id',
    email: 'admin@digipicks.test',
    name: 'E2E Admin',
    role: 'admin',
  },
  creator: {
    id: 'e2e-creator-user-id',
    email: 'creator1@digipicks.test',
    name: 'E2E Creator',
    role: 'creator',
  },
  subscriber: {
    id: 'e2e-subscriber-user-id',
    email: 'subscriber1@digipicks.test',
    name: 'E2E Subscriber',
    role: 'subscriber',
  },
} as const;

export type E2ERole = keyof typeof E2E_USERS;

/**
 * Set auth state in localStorage for a given app URL.
 */
async function setAuthForApp(page: Page, appUrl: string, user: (typeof E2E_USERS)[E2ERole]): Promise<void> {
  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });

  await page.evaluate((userData) => {
    const authData = {
      id: userData.id,
      _id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      isAuthenticated: true,
    };
    // Set in all possible storage keys (web, backoffice/dashboard)
    localStorage.setItem('digilist_saas_web_user', JSON.stringify(authData));
    localStorage.setItem('digilist_saas_user', JSON.stringify(authData));
    localStorage.setItem('digilist_saas_backoffice_user', JSON.stringify(authData));
    localStorage.setItem('digilist_saas_auth_token', 'e2e-token-' + userData.id);
    localStorage.setItem('digilist_saas_backoffice_session_token', 'e2e-token-' + userData.id);
  }, user);

  await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Extended test fixtures with role-based auth. */
export const test = base.extend<{
  loginAsSuperadmin: (app?: 'web' | 'backoffice' | 'minside' | 'dashboard') => Promise<void>;
  loginAsAdmin: (app?: 'web' | 'backoffice' | 'minside' | 'dashboard') => Promise<void>;
  loginAsCreator: (app?: 'web' | 'backoffice' | 'minside' | 'dashboard') => Promise<void>;
  loginAsSubscriber: (app?: 'web' | 'backoffice' | 'minside' | 'dashboard') => Promise<void>;
  loginAs: (role: E2ERole, app?: 'web' | 'backoffice' | 'minside' | 'dashboard') => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    await use(async (role: E2ERole, app = 'web') => {
      const urls = { web: WEB_URL, backoffice: BACKOFFICE_URL, minside: MINSIDE_URL, dashboard: DASHBOARD_URL };
      await setAuthForApp(page, urls[app], E2E_USERS[role]);
    });
  },
  loginAsSuperadmin: async ({ loginAs }, use) => {
    await use(async (app = 'dashboard') => loginAs('superadmin', app));
  },
  loginAsAdmin: async ({ loginAs }, use) => {
    await use(async (app = 'dashboard') => loginAs('admin', app));
  },
  loginAsCreator: async ({ loginAs }, use) => {
    await use(async (app = 'dashboard') => loginAs('creator', app));
  },
  loginAsSubscriber: async ({ loginAs }, use) => {
    await use(async (app = 'web') => loginAs('subscriber', app));
  },
});

export { expect } from '@playwright/test';
