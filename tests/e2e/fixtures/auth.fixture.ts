/**
 * Auth Fixture — role-based login for A-krav tests.
 *
 * Extends the base Playwright test with loginAs() helpers that set
 * auth state via localStorage bypass for deterministic role testing.
 */

import { test as base, type Page } from "@playwright/test";

const WEB_URL = process.env.TEST_BASE_URL || "http://localhost:5190";
const BACKOFFICE_URL = process.env.TEST_BACKOFFICE_URL || "http://localhost:5175";
const MINSIDE_URL = process.env.TEST_MINSIDE_URL || "http://localhost:5174";
const DASHBOARD_URL = process.env.TEST_DASHBOARD_URL || "http://localhost:5180";

/** E2E test users matching seed-e2e.ts */
export const E2E_USERS = {
  superadmin: {
    id: "e2e-superadmin-user-id",
    email: "e2e-superadmin@test.example.com",
    name: "E2E Superadmin",
    role: "superadmin",
  },
  admin: {
    id: "e2e-admin-user-id",
    email: "e2e-admin@test.example.com",
    name: "E2E Admin",
    role: "admin",
  },
  owner: {
    id: "e2e-owner-user-id",
    email: "e2e-owner@test.example.com",
    name: "E2E Owner",
    role: "owner",
  },
  counter: {
    id: "e2e-counter-user-id",
    email: "e2e-counter@test.example.com",
    name: "E2E Counter",
    role: "counter",
  },
  finance: {
    id: "e2e-finance-user-id",
    email: "e2e-finance@test.example.com",
    name: "E2E Finance",
    role: "finance",
  },
  saksbehandler: {
    id: "e2e-handler-user-id",
    email: "e2e-handler@test.example.com",
    name: "E2E Saksbehandler",
    role: "saksbehandler",
  },
  arranger: {
    id: "e2e-arranger-user-id",
    email: "e2e-arranger@test.example.com",
    name: "E2E Arranger",
    role: "arranger",
  },
  user: {
    id: "e2e-user-user-id",
    email: "e2e-user@test.example.com",
    name: "E2E User",
    role: "user",
  },
  member: {
    id: "e2e-member-user-id",
    email: "e2e-member@test.example.com",
    name: "E2E Member",
    role: "user",
    membership: "kulturhusvenn",
  },
} as const;

export type E2ERole = keyof typeof E2E_USERS;

/**
 * Set auth state in localStorage for a given app URL.
 */
async function setAuthForApp(
  page: Page,
  appUrl: string,
  user: (typeof E2E_USERS)[E2ERole]
): Promise<void> {
  await page.goto(appUrl, { waitUntil: "domcontentloaded" });

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
    localStorage.setItem("digilist_saas_web_user", JSON.stringify(authData));
    localStorage.setItem("digilist_saas_user", JSON.stringify(authData));
    localStorage.setItem("digilist_saas_backoffice_user", JSON.stringify(authData));
    localStorage.setItem("digilist_saas_auth_token", "e2e-token-" + userData.id);
    localStorage.setItem("digilist_saas_backoffice_session_token", "e2e-token-" + userData.id);
  }, user);

  await page.reload({ waitUntil: "domcontentloaded" });
}

/** Extended test fixtures with role-based auth. */
export const test = base.extend<{
  loginAsAdmin: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsSuperadmin: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsOwner: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsCounter: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsFinance: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsSaksbehandler: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsArranger: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsUser: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAsMember: (app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
  loginAs: (role: E2ERole, app?: "web" | "backoffice" | "minside" | "dashboard") => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    await use(async (role: E2ERole, app = "web") => {
      const urls = { web: WEB_URL, backoffice: BACKOFFICE_URL, minside: MINSIDE_URL, dashboard: DASHBOARD_URL };
      await setAuthForApp(page, urls[app], E2E_USERS[role]);
    });
  },
  loginAsSuperadmin: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("superadmin", app));
  },
  loginAsAdmin: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("admin", app));
  },
  loginAsOwner: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("owner", app));
  },
  loginAsCounter: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("counter", app));
  },
  loginAsFinance: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("finance", app));
  },
  loginAsSaksbehandler: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("saksbehandler", app));
  },
  loginAsArranger: async ({ loginAs }, use) => {
    await use(async (app = "dashboard") => loginAs("arranger", app));
  },
  loginAsUser: async ({ loginAs }, use) => {
    await use(async (app = "web") => loginAs("user", app));
  },
  loginAsMember: async ({ loginAs }, use) => {
    await use(async (app = "web") => loginAs("member", app));
  },
});

export { expect } from "@playwright/test";
