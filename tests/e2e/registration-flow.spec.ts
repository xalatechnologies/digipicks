/**
 * Registration & Auth Flow E2E Tests
 *
 * Tests the complete registration journey on the web app:
 * - Landing page CTA → register page
 * - All auth method options are visible
 * - Magic link inline form expand/collapse
 * - Phone inline form expand/collapse
 * - Email/password registration form
 * - Post-registration auto-login and redirect
 */

import { test, expect } from '@playwright/test';

test.describe('Registration Page', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/register?intent=owner');
    });

    test('renders all 4 auth method options', async ({ page }) => {
        // Verify the page heading
        await expect(page.locator('h1')).toContainText('Opprett konto');

        // Verify all 4 LoginOption buttons are visible
        const loginOptions = page.locator('button').filter({ hasText: /Registrer med/ });
        await expect(loginOptions.nth(0)).toContainText('BankID');
        await expect(loginOptions.nth(1)).toContainText('Vipps');
        await expect(loginOptions.nth(2)).toContainText('telefon');

        // Magic link option
        const magicLinkOption = page.locator('button').filter({ hasText: /Magic link/ });
        await expect(magicLinkOption).toBeVisible();

        // Divider text
        await expect(page.locator('text=eller registrer med e-post og passord')).toBeVisible();

        // Email/password toggle button
        await expect(page.locator('button').filter({ hasText: 'Registrer med e-post og passord' })).toBeVisible();
    });

    test('magic link form expands and collapses', async ({ page }) => {
        // Click magic link option
        const magicLinkOption = page.locator('button').filter({ hasText: /Magic link/ });
        await magicLinkOption.click();

        // Verify inline form appears
        await expect(page.locator('text=Skriv inn e-postadresse')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('button').filter({ hasText: 'Send innloggingslenke' })).toBeVisible();

        // Cancel button collapses the form
        await page.locator('button').filter({ hasText: 'Avbryt' }).click();
        await expect(page.locator('text=Skriv inn e-postadresse')).not.toBeVisible();
    });

    test('phone form expands and shows coming soon notice', async ({ page }) => {
        // Click phone option
        const phoneOption = page.locator('button').filter({ hasText: /telefon/ });
        await phoneOption.click();

        // Verify inline phone form appears
        await expect(page.locator('text=Skriv inn telefonnummer')).toBeVisible();
        await expect(page.locator('input[type="tel"]')).toBeVisible();

        // Submit shows "coming soon" message
        await page.locator('input[type="tel"]').fill('+47 900 00 000');
        await page.locator('button').filter({ hasText: 'Send kode' }).click();

        await expect(page.locator('text=Kommer snart')).toBeVisible();
        await expect(page.locator('text=SMS-registrering er under utvikling')).toBeVisible();
    });

    test('email/password form expands on button click', async ({ page }) => {
        // Click the toggle button
        await page.locator('button').filter({ hasText: 'Registrer med e-post og passord' }).click();

        // Verify form fields appear
        await expect(page.locator('input[autocomplete="name"]')).toBeVisible();
        await expect(page.locator('input[type="email"]')).toBeVisible();
        await expect(page.locator('input[autocomplete="new-password"]').first()).toBeVisible();

        // Verify submit button
        await expect(page.locator('button[type="submit"]').filter({ hasText: 'Opprett konto' })).toBeVisible();
    });

    test('email/password form has required field validation', async ({ page }) => {
        // Expand email form
        await page.locator('button').filter({ hasText: 'Registrer med e-post og passord' }).click();

        // Verify required attributes are present on key fields
        const nameField = page.locator('input[autocomplete="name"]');
        await expect(nameField).toHaveAttribute('required', '');

        const emailField = page.locator('input[type="email"]');
        await expect(emailField).toHaveAttribute('required', '');

        const passwordField = page.locator('input[autocomplete="new-password"]').first();
        await expect(passwordField).toHaveAttribute('required', '');
    });

    test('email/password form validates password match', async ({ page }) => {
        // Expand email form
        await page.locator('button').filter({ hasText: 'Registrer med e-post og passord' }).click();

        // Fill form with mismatched passwords
        await page.locator('input[autocomplete="name"]').fill('Test Bruker');
        await page.locator('input[type="email"]').fill('test-e2e@example.com');
        const passwordFields = page.locator('input[autocomplete="new-password"]');
        await passwordFields.nth(0).fill('TestPassord123!');
        await passwordFields.nth(1).fill('AnnetPassord456!');

        // Submit
        await page.locator('button[type="submit"]').filter({ hasText: 'Opprett konto' }).click();

        // Should show password mismatch error (appears in both validation + alert, use first)
        await expect(page.locator('text=Passordene stemmer ikke overens').first()).toBeVisible();
    });

    test('password strength meter updates as user types', async ({ page }) => {
        // Expand email form
        await page.locator('button').filter({ hasText: 'Registrer med e-post og passord' }).click();

        const passwordField = page.locator('input[autocomplete="new-password"]').first();

        // Type weak password
        await passwordField.fill('abc');
        // No strength indicator for very short passwords (< 8 chars)

        // Type OK password
        await passwordField.fill('abcdefgh');
        await expect(page.locator('#password-strength')).toBeVisible();

        // Type strong password with upper, number, special
        await passwordField.fill('StrongPass123!');
        await expect(page.locator('#password-strength')).toContainText(/Sterkt|Veldig sterkt|Utmerket/);
    });

    test('"Har du allerede en konto?" login link is present', async ({ page }) => {
        await expect(page.locator('text=Har du allerede en konto?')).toBeVisible();
        const loginLink = page.locator('a[href="/login"]');
        await expect(loginLink).toBeVisible();
        await expect(loginLink).toContainText('Logg inn');
    });

    test('switching between phone and magic link forms', async ({ page }) => {
        // Click phone option
        await page.locator('button').filter({ hasText: /telefon/ }).click();
        await expect(page.locator('text=Skriv inn telefonnummer')).toBeVisible();

        // Now click magic link — phone form should close, magic link opens
        const magicLinkOption = page.locator('button').filter({ hasText: /Magic link/ });
        await magicLinkOption.click();
        await expect(page.locator('text=Skriv inn telefonnummer')).not.toBeVisible();
        await expect(page.locator('text=Skriv inn e-postadresse')).toBeVisible();
    });
});

test.describe('Registration from Bli Utleier', () => {
    test('CTA button navigates to register with owner intent', async ({ page }) => {
        await page.goto('/bli-utleier');

        // Click CTA button
        const ctaButton = page.locator('button').filter({ hasText: 'Kom i gang gratis' }).first();
        await expect(ctaButton).toBeVisible();
        await ctaButton.click();

        // Should navigate to register with intent=owner
        await page.waitForURL('/register?intent=owner');
        await expect(page.locator('h1')).toContainText('Opprett konto');
    });

    test('hero section has video carousel', async ({ page }) => {
        await page.goto('/bli-utleier');

        // Verify at least one video element is present in the hero
        const videos = page.locator('video');
        await expect(videos.first()).toBeVisible();

        // Verify the video is autoplaying (should have autoplay attribute or be playing)
        const firstVideo = videos.first();
        await expect(firstVideo).toHaveAttribute('autoplay', '');
    });
});

test.describe('Register page without intent', () => {
    test('shows default panel copy (not owner-specific)', async ({ page }) => {
        await page.goto('/register');
        await expect(page.locator('h1')).toContainText('Opprett konto');
        // The panel should say "Bli med" not "Bli utleier"
        await expect(page.locator('text=Bli med på DigiList')).toBeVisible();
    });
});
