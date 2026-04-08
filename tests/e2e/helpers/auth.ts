/**
 * E2E Test Auth Helpers
 *
 * Provides authentication utilities for E2E tests.
 * Supports both real login (when available) and mock/bypass methods.
 */

import { Page } from '@playwright/test';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5190';

// Demo credentials (matches seed data)
export const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demo123',
  name: 'Demo User',
};

export const DEMO_ADMIN = {
  email: 'admin@example.com',
  password: 'admin123',
  name: 'Admin User',
};

// A-krav E2E role-specific users (match scripts/seed-e2e.ts)
export const E2E_COUNTER = {
  email: 'e2e-counter@test.example.com',
  name: 'E2E Counter',
  role: 'counter',
};

export const E2E_FINANCE = {
  email: 'e2e-finance@test.example.com',
  name: 'E2E Finance',
  role: 'finance',
};

export const E2E_SAKSBEHANDLER = {
  email: 'e2e-handler@test.example.com',
  name: 'E2E Saksbehandler',
  role: 'saksbehandler',
};

/**
 * Try to login via the login page.
 * Returns true if successful, false otherwise.
 * @param baseUrl - Optional base URL for the app (defaults to TEST_BASE_URL / web app)
 */
export async function tryLogin(
  page: Page,
  email: string,
  password: string,
  baseUrl?: string
): Promise<boolean> {
  const url = baseUrl ?? BASE_URL;
  try {
    await page.goto(`${url}/login`);
    await page.waitForTimeout(500);

    // Check for login form
    const emailInput = page.locator(
      'input[type="email"], input[name="email"], input[placeholder*="e-post"], [data-testid="email-input"]'
    ).first();

    if ((await emailInput.count()) === 0) {
      console.log('Login form not found');
      return false;
    }

    await emailInput.fill(email);

    const passwordInput = page.locator(
      'input[type="password"], input[name="password"], [data-testid="password-input"]'
    ).first();
    await passwordInput.fill(password);

    const loginButton = page.locator(
      'button[type="submit"], button:has-text("Logg inn"), button:has-text("Login"), [data-testid="login-button"]'
    ).first();
    await loginButton.click();

    // Wait for navigation or error
    await page.waitForTimeout(2000);

    // Check if still on login page (failed)
    if (page.url().includes('/login')) {
      const errorMsg = page.locator('[class*="error"], [role="alert"], .error-message');
      if ((await errorMsg.count()) > 0) {
        console.log('Login failed with error');
        return false;
      }
    }

    return !page.url().includes('/login');
  } catch (error) {
    console.log('Login error:', error);
    return false;
  }
}

/**
 * Login as demo user.
 */
export async function loginAsDemo(page: Page): Promise<boolean> {
  return tryLogin(page, DEMO_USER.email, DEMO_USER.password);
}

/**
 * Login as admin user.
 */
export async function loginAsAdmin(page: Page): Promise<boolean> {
  return tryLogin(page, DEMO_ADMIN.email, DEMO_ADMIN.password);
}

/**
 * Set auth state directly in localStorage (bypass login UI).
 * This is useful when the login UI doesn't work in tests.
 */
export async function setAuthState(
  page: Page,
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
  }
): Promise<void> {
  await page.goto(BASE_URL);

  await page.evaluate((userData) => {
    const authData = {
      id: userData.id,
      _id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role || 'user',
      isAuthenticated: true,
    };

    // Set in all possible storage keys used by the app
    localStorage.setItem('digilist_saas_web_user', JSON.stringify(authData));
    localStorage.setItem('digilist_saas_user', JSON.stringify(authData));
    localStorage.setItem('digilist_saas_auth_token', 'test-token-' + userData.id);
  }, user);

  // Reload to apply auth state
  await page.reload();
  await page.waitForTimeout(500);
}

/**
 * Set demo user auth state directly.
 */
export async function setDemoAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'demo-user-id',
    email: DEMO_USER.email,
    name: DEMO_USER.name,
    role: 'user',
  });
}

/**
 * Set admin auth state directly.
 */
export async function setAdminAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'admin-user-id',
    email: DEMO_ADMIN.email,
    name: DEMO_ADMIN.name,
    role: 'admin',
  });
}

/**
 * Clear all auth state.
 */
export async function logout(page: Page): Promise<void> {
  await page.goto(BASE_URL);

  await page.evaluate(() => {
    localStorage.removeItem('digilist_saas_web_user');
    localStorage.removeItem('digilist_saas_user');
    localStorage.removeItem('digilist_saas_auth_token');
    localStorage.removeItem('digilist_saas_web_tenant_id');
    localStorage.removeItem('digilist_saas_tenant_id');
  });

  await page.reload();
}

/**
 * Check if currently authenticated.
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const user =
      localStorage.getItem('digilist_saas_web_user') ||
      localStorage.getItem('digilist_saas_user');
    return !!user;
  });
}

/**
 * Get current user from localStorage.
 */
export async function getCurrentUser(page: Page): Promise<{
  id: string;
  email: string;
  name: string;
} | null> {
  return page.evaluate(() => {
    const stored =
      localStorage.getItem('digilist_saas_web_user') ||
      localStorage.getItem('digilist_saas_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  });
}

/**
 * Set counter role auth state directly.
 */
export async function setCounterAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'e2e-counter-user-id',
    email: E2E_COUNTER.email,
    name: E2E_COUNTER.name,
    role: 'counter',
  });
}

/**
 * Set finance role auth state directly.
 */
export async function setFinanceAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'e2e-finance-user-id',
    email: E2E_FINANCE.email,
    name: E2E_FINANCE.name,
    role: 'finance',
  });
}

/**
 * Set saksbehandler role auth state directly.
 */
export async function setSaksbehandlerAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'e2e-handler-user-id',
    email: E2E_SAKSBEHANDLER.email,
    name: E2E_SAKSBEHANDLER.name,
    role: 'saksbehandler',
  });
}

// ---------------------------------------------------------------------------
// Additional role-specific users (consolidation)
// ---------------------------------------------------------------------------

export const E2E_SUPERADMIN = {
  email: 'e2e-superadmin@test.example.com',
  name: 'E2E Superadmin',
  role: 'superadmin',
};

export const E2E_OWNER = {
  email: 'e2e-owner@test.example.com',
  name: 'E2E Owner',
  role: 'owner',
};

export const E2E_ARRANGER = {
  email: 'e2e-arranger@test.example.com',
  name: 'E2E Arranger',
  role: 'arranger',
};

/**
 * Set superadmin auth state directly.
 */
export async function setSuperadminAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'e2e-superadmin-user-id',
    email: E2E_SUPERADMIN.email,
    name: E2E_SUPERADMIN.name,
    role: 'superadmin',
  });
}

/**
 * Set owner auth state directly.
 */
export async function setOwnerAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'e2e-owner-user-id',
    email: E2E_OWNER.email,
    name: E2E_OWNER.name,
    role: 'owner',
  });
}

/**
 * Set arranger auth state directly.
 */
export async function setArrangerAuthState(page: Page): Promise<void> {
  await setAuthState(page, {
    id: 'e2e-arranger-user-id',
    email: E2E_ARRANGER.email,
    name: E2E_ARRANGER.name,
    role: 'arranger',
  });
}

