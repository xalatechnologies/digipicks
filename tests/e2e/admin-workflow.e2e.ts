/**
 * Admin Workflow E2E Tests
 *
 * End-to-end tests for administrative functions.
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Workflow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin
        await page.goto('/auth/login');
        await page.fill('[data-testid="email"]', 'admin@example.com');
        await page.fill('[data-testid="password"]', 'admin-password');
        await page.click('[data-testid="login-button"]');
        await page.waitForURL('/dashboard');
    });

    test('resource management workflow', async ({ page }) => {
        // Navigate to resource management
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-resources"]');
        await page.waitForURL('/admin/resources');

        // Create new resource
        await page.click('[data-testid="create-resource"]');
        await page.waitForURL('/admin/resources/new');

        // Fill resource form
        await page.fill('[data-testid="resource-name"]', 'Test Meeting Room');
        await page.fill('[data-testid="resource-slug"]', 'test-meeting-room');
        await page.selectOption('[data-testid="resource-category"]', 'LOKALER');
        await page.fill('[data-testid="resource-description"]', 'A test meeting room for E2E testing');
        await page.fill('[data-testid="resource-capacity"]', '10');
        
        // Set pricing
        await page.fill('[data-testid="hourly-price"]', '500');
        await page.selectOption('[data-testid="currency"]', 'NOK');

        // Add amenities
        await page.click('[data-testid="add-amenity"]');
        await page.selectOption('[data-testid="amenity-select"]', 'projector');
        await page.fill('[data-testid="amenity-quantity"]', '1');
        await page.click('[data-testid="save-amenity"]');

        // Save resource
        await page.click('[data-testid="save-resource"]');
        await page.waitForSelector('[data-testid="save-success"]');

        // Verify resource appears in list
        await expect(page.locator('[data-testid="resource-row"]')).toContainText('Test Meeting Room');

        // Edit resource
        await page.click('[data-testid="edit-resource"]:first-child');
        await page.fill('[data-testid="resource-name"]', 'Updated Meeting Room');
        await page.click('[data-testid="save-resource"]');
        await expect(page.locator('[data-testid="resource-row"]')).toContainText('Updated Meeting Room');

        // Publish resource
        await page.click('[data-testid="publish-resource"]:first-child');
        await expect(page.locator('[data-testid="resource-status"]')).toContainText('published');
    });

    test('user management workflow', async ({ page }) => {
        // Navigate to user management
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-users"]');
        await page.waitForURL('/admin/users');

        // Invite new user
        await page.click('[data-testid="invite-user"]');
        await page.fill('[data-testid="user-email"]', 'newuser@example.com');
        await page.fill('[data-testid="user-name"]', 'New Test User');
        await page.selectOption('[data-testid="user-role"]', 'resource_manager');
        await page.click('[data-testid="send-invitation"]');

        // Verify invitation sent
        await expect(page.locator('[data-testid="invitation-success"]')).toBeVisible();
        await expect(page.locator('[data-testid="user-row"]')).toContainText('newuser@example.com');
        await expect(page.locator('[data-testid="user-status"]')).toContainText('invited');

        // Suspend user
        await page.click('[data-testid="suspend-user"]');
        await page.fill('[data-testid="suspension-reason"]', 'Policy violation');
        await page.click('[data-testid="confirm-suspend"]');
        await expect(page.locator('[data-testid="user-status"]')).toContainText('suspended');

        // Reactivate user
        await page.click('[data-testid="reactivate-user"]');
        await page.click('[data-testid="confirm-reactivate"]');
        await expect(page.locator('[data-testid="user-status"]')).toContainText('active');
    });

    test('season management workflow', async ({ page }) => {
        // Navigate to season management
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-seasons"]');
        await page.waitForURL('/admin/seasons');

        // Create new season
        await page.click('[data-testid="create-season"]');
        await page.fill('[data-testid="season-name"]', 'Summer 2024 Test');
        await page.selectOption('[data-testid="season-type"]', 'rental');
        
        // Set dates
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() + 1);
        const endDate = new Date(startDate);
        endDate.setMonth(endDate.getMonth() + 3);

        await page.fill('[data-testid="season-start"]', startDate.toISOString().split('T')[0]);
        await page.fill('[data-testid="season-end"]', endDate.toISOString().split('T')[0]);
        
        // Set application period
        await page.fill('[data-testid="application-start"]', new Date().toISOString().split('T')[0]);
        const appEndDate = new Date();
        appEndDate.setDate(appEndDate.getDate() + 30);
        await page.fill('[data-testid="application-end"]', appEndDate.toISOString().split('T')[0]);

        await page.click('[data-testid="save-season"]');

        // Publish season
        await page.click('[data-testid="publish-season"]');
        await expect(page.locator('[data-testid="season-status"]')).toContainText('published');

        // Review applications
        await page.click('[data-testid="view-applications"]');
        await expect(page.locator('[data-testid="application-list"]')).toBeVisible();

        // Approve an application if exists
        const hasApplications = await page.locator('[data-testid="application-row"]').isVisible();
        if (hasApplications) {
            await page.click('[data-testid="application-row"]:first-child');
            await page.click('[data-testid="approve-application"]');
            await page.fill('[data-testid="approval-note"]', 'Approved for testing');
            await page.click('[data-testid="confirm-approve"]');
            await expect(page.locator('[data-testid="application-status"]')).toContainText('approved');
        }
    });

    test('organization management', async ({ page }) => {
        // Navigate to organization management
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-organizations"]');
        await page.waitForURL('/admin/organizations');

        // Create organization
        await page.click('[data-testid="create-organization"]');
        await page.fill('[data-testid="org-name"]', 'Test Organization');
        await page.fill('[data-testid="org-slug"]', 'test-org');
        await page.fill('[data-testid="org-description"]', 'Test organization for E2E');
        await page.click('[data-testid="save-organization"]');

        // Verify organization created
        await expect(page.locator('[data-testid="org-row"]')).toContainText('Test Organization');

        // Add sub-organization
        await page.click('[data-testid="add-sub-org"]');
        await page.selectOption('[data-testid="parent-org"]', 'test-org');
        await page.fill('[data-testid="sub-org-name"]', 'Sub Department');
        await page.fill('[data-testid="sub-org-slug"]', 'sub-dept');
        await page.click('[data-testid="save-sub-org"]');

        // View organization tree
        await page.click('[data-testid="view-tree"]');
        await expect(page.locator('[data-testid="org-tree"]')).toBeVisible();
        await expect(page.locator('[data-testid="org-node"]')).toContainText('Test Organization');
        await expect(page.locator('[data-testid="org-node"]')).toContainText('Sub Department');
    });

    test('pricing management', async ({ page }) => {
        // Navigate to pricing
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-pricing"]');
        await page.waitForURL('/admin/pricing');

        // Create pricing group
        await page.click('[data-testid="create-pricing-group"]');
        await page.fill('[data-testid="group-name"]', 'Test Pricing Group');
        await page.selectOption('[data-testid="group-type"]', 'base');
        await page.click('[data-testid="save-group"]');

        // Add pricing to resource
        await page.click('[data-testid="resource-pricing"]');
        await page.selectOption('[data-testid="resource-select"]', 'meeting-room-a');
        await page.selectOption('[data-testid="pricing-group"]', 'Test Pricing Group');
        await page.fill('[data-testid="price"]', '600');
        await page.selectOption('[data-testid="pricing-unit"]', 'hour');
        await page.click('[data-testid="save-pricing"]');

        // Test price calculator
        await page.click('[data-testid="price-calculator"]');
        await page.selectOption('[data-testid="calc-resource"]', 'meeting-room-a');
        await page.fill('[data-testid="calc-start-time"]', '09:00');
        await page.fill('[data-testid="calc-end-time"]', '11:00');
        await page.click('[data-testid="calculate-price"]');
        
        await expect(page.locator('[data-testid="calculated-price"]')).toContainText('1200');
    });

    test('audit trail viewing', async ({ page }) => {
        // Navigate to audit
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-audit"]');
        await page.waitForURL('/admin/audit');

        // Filter by booking
        await page.selectOption('[data-testid="entity-type"]', 'booking');
        await page.fill('[data-testid="entity-id"]', 'booking123');
        await page.click('[data-testid="apply-filter"]');

        // Verify audit entries
        await expect(page.locator('[data-testid="audit-entry"]')).toBeVisible();
        await expect(page.locator('[data-testid="audit-timestamp"]')).toBeVisible();
        await expect(page.locator('[data-testid="audit-action"]')).toBeVisible();
        await expect(page.locator('[data-testid="audit-user"]')).toBeVisible();

        // Export audit log
        await page.click('[data-testid="export-audit"]');
        await expect(page.locator('[data-testid="export-success"]')).toBeVisible();
    });

    test('integration management', async ({ page }) => {
        // Navigate to integrations
        await page.click('[data-testid="nav-admin"]');
        await page.click('[data-testid="admin-integrations"]');
        await page.waitForURL('/admin/integrations');

        // Configure Stripe integration
        await page.click('[data-testid="integration-stripe"]');
        await page.click('[data-testid="configure-integration"]');
        
        await page.fill('[data-testid="stripe-secret-key"]', 'sk_test_...');
        await page.fill('[data-testid="stripe-webhook-secret"]', 'whsec_...');
        await page.click('[data-testid="save-config"]');

        // Test connection
        await page.click('[data-testid="test-connection"]');
        await expect(page.locator('[data-testid="connection-success"]')).toBeVisible();

        // Enable integration
        await page.click('[data-testid="enable-integration"]');
        await expect(page.locator('[data-testid="integration-status"]')).toContainText('enabled');

        // View webhooks
        await page.click('[data-testid="view-webhooks"]');
        await expect(page.locator('[data-testid="webhook-list"]')).toBeVisible();
    });
});
